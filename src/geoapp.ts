import express, { Router } from 'express';
import cluster from 'cluster';
import http from 'http';
import os from 'os';
import axios, {AxiosError} from 'axios';
import jwt from 'jsonwebtoken';
import basic_auth from 'basic-auth';
import _ from 'lodash';
import geotz from 'geo-tz';
import {Logger} from '@pieropatron/tinylogger';

import {getCache, buildKey} from './lib/cache';
import {getConfig} from './lib/utils';
import {ResponseError, AccessForbidden, BadRequest} from './lib/errors';

const logger = new Logger(`geoproxi`);

const initWorker = async ()=>{
	const send = process.send;
	if (!send){
		throw new Error(`Invalid call`);
	}

	const cfg = await getConfig();
	const cache = await getCache(cfg.redis.url, cfg.redis.ttl_seconds);

	const restapi = express();
	restapi.use(express.json());

	restapi.all("*", (req, res, next)=>{
		const auth = req.headers["authorization"];
		if (!auth){
			return next(new AccessForbidden({path: req.path, body: req.body}));
		}
		if (/^bearer/i.test(auth)){
			const token = auth.slice(6).trim();
			return jwt.verify(token, cfg.jwt_auth.key, (error)=>{
				if (error){
					return next(new AccessForbidden({path: req.path, body: req.body, jwt_error: error.message}));
				} else {
					return next();
				}
			});
		} else {
			const credentials = basic_auth.parse(auth);
			if (credentials === undefined){
				return next(new AccessForbidden({path: req.path, body: req.body}));
			}
			const {name, pass} = credentials;
			if (name !== cfg.basic_auth.user || pass !== cfg.basic_auth.pass){
				return next(new AccessForbidden({path: req.path, body: req.body, name, pass}));
			}
			return next();
		}
	});

	const redirect = (router: Router, dest_url: string)=>{
		router.all("*", async (req, res, next)=>{
			const pathname = req.path;
			const {body, query, method} = req;
			const key = await buildKey({
				body,
				query,
				method,
				pathname
			});

			let result = await cache.get(key);
			if (!result){
				const url = `${dest_url}${pathname}`;
				try {
					const response = await axios(url, {
						method: method.toLowerCase(),
						validateStatus: ()=>true,
						params: query,
						data: body,
						responseType: 'json',
						timeout: 1000
					});

					if (response.status !== 200){
						return next(new ResponseError(response.statusText, response.status, response.statusText, {url, body, query, method, response: response.data}));
					}
					if (typeof(response.data) !== 'object'){
						return next(new BadRequest({url, body, query, method, response: response.data}));
					}

					result = response.data;
				} catch (e){
					return next(e);
				}
				await cache.set(key, result);
			}
			res.json(result);
		});
	};

	_.each(["nominatim", "osrm"], key=>{
		const router = express.Router();
		redirect(router, cfg[key].url);
		restapi.use(`/${key}`, router);
	});

	const checkNumber = (query: any, key: string)=>{
		const float = parseFloat(query[key]);
		if (!_.isNumber(float) || !_.isFinite(float)){
			throw new BadRequest({key, value: query[key]});
		}
		return float;
	};

	restapi.get("/geotz", async (req, res)=>{
		const query = req.query;
		const lat: number = checkNumber(query, 'lat');
		const lon: number = checkNumber(query, 'lon');

		const key = await buildKey({
			body: {},
			method: req.method,
			query: {lat, lon},
			pathname: req.path
		});

		let result = await cache.get(key);
		if (!result){
			result = geotz.find(lat, lon);
			if (_.size(result)){
				await cache.set(key, result);
			} else {
				result = [];
			}
		}

		res.json(result);
	});

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	restapi.use((error, req, res, next)=>{
		if (!error){
			return;
		}

		if (error instanceof ResponseError){
			res.status(error.code).json({
				status: error.message,
				message: error.message,
				...error.data
			});
		} else if (error instanceof AxiosError) {
			res.status(error.code).json({
				status: error.message,
				message: error.message
			});
		} else {
			logger.fatal(error);
			process.exit(1);
		}

	});

	logger.info(`worker`, process.pid, 'started');
	await new Promise<void>((resolve, reject)=>{
		http.createServer(restapi).listen(cfg.restapi.port, ()=>{
			send.call(process, {ok: true}, (error: null|Error)=>{
				if (error) reject(error);
				else resolve();
			});
		});
	});
};

const initPrimary = async ()=>{
	const cfg = await getConfig();
	const worker_count = cfg.restapi.worker_count || os.cpus().length;
	for (let i=0; i<worker_count; i++){
		await new Promise<void>((resolve, reject)=>{
			cluster.fork().once('message', (message: {ok: boolean})=>{
				if (message.ok){
					resolve();
				} else {
					reject(new Error(`Unexpected message from worker`));
				}
			});
		});
	}

	logger.info(`workers initiated`);

	cluster.on('exit', (worker, code, signal)=>{
		logger.warn(`worker PID:`, worker.process.pid, `exited with code:`, code, ', signal:', signal);
		cluster.fork();
	});
};

const start = async ()=>{
	if (cluster.isWorker){
		await initWorker();
	} else {
		await initPrimary();
	}
};

const time = logger.time('init');
start().then(()=>{
	time();
}, error=>{
	time();
	logger.fatal(error);
	process.exit(1);
});
