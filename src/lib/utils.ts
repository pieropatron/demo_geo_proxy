import _ from 'lodash';
import fs from 'fs';
import DefaultConfig from '../config';

export const getConfig = async (): Promise<typeof DefaultConfig>=>{
	const lcfg_path = __dirname + '/../local-config.js';
	if (fs.existsSync(lcfg_path)){
		const lcfg = await import(lcfg_path);
		return _.defaults({}, lcfg, DefaultConfig);
	}
	return DefaultConfig;
};
