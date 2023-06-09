import jwt from 'jsonwebtoken';
import {Logger} from '@pieropatron/tinylogger';
import {getConfig} from './lib/utils';

const logger = new Logger(`generate jwt`);

const run = async ()=>{
	const cfg = await getConfig();
	return jwt.sign({iss: cfg.jwt_auth.iss}, cfg.jwt_auth.key, {expiresIn: "3y"});
};

run().then(token=>{
	logger.info(`token:`, token);
}, (error: Error)=>{
	logger.fatal(error);
	process.exit(1);
});
