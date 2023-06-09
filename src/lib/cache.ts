import {createClient, RedisClientType} from 'redis';
import zlib from 'zlib';

export type CacheKey = {
	pathname: string,
	method: string,
	query: Record<string, any>,
	body: Record<string, any>
}

export const buildKey = async (options: CacheKey)=>{
	const json = JSON.stringify(options);

	return new Promise<string>((resolve, reject)=>{
		zlib.gzip(json, (error, result)=>{
			if (error) return reject(error);
			else return resolve(result.toString('base64'));
		});
	});
};

class Cache {
	private client: RedisClientType;
	private ttl: number;
	constructor(url: string, ttl: number){
		this.client = createClient({url});
		this.ttl = ttl;
	}

	async connect(){
		await this.client.connect();
		return this;
	}

	async get(key: string){
		const value = await this.client.get(key);
		if (!value) return;
		return JSON.parse(value);
	}

	async set(key: string, value: Record<string, any>){
		this.client.set(key, JSON.stringify(value), {
			EX: this.ttl
		});
	}
}

export async function getCache(url: string, ttl: number){
	return new Cache(url, ttl).connect();
}
