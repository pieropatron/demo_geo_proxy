# demo_geo_proxy

Demo project for create proxy server to get geo data from OSM API's (Nominatim, OSRM) and for get information about timezone by location.

SometimesProblems, which project suppose to solve:
1. As I know, Nominatim and OSRM doesn't have authorization "out of the box". Also, they haven't built-in cache. This service allows to use Basic and JWT authorization and Cache, based on Redis.
2. Geo-tz (https://github.com/evansiroky/node-geo-tz) is a beautiful tool for get information regarding IANA timezones by geo locations. But, as it has a lot of data and requires periodical updates of timezones settings, it is not comfortable to have it imported to the project, which is supposed to be used even at few of servers. Instead of that, in my opinion, better to have single server with RESTAPI to get this information. This should allow actualize tz data only for this server and to avoid dependency from this lib for another projects.


# Installation:
``` bash
git clone https://github.com/pieropatron/demo_geo_proxy
npm install
```

For work service uses configuration files. After install, please, create file "local-config.js" at dist folder and fill it with following options:

``` ts
exports.default = {
	restapi: {
		port: 3000, // port of appication
		worker_count: 0 // amount of cluster workers
	},
	// settings for Basic Auth
	basic_auth: {
		user: 'user',
		pass: 'pass'
	},
	// settings for JWT authorization
	jwt_auth: {
		key: 'key',
		iss: 'iss',
		expires: '1m'
	},
	redis: {
		// url for redis client
		url: "redis://127.0.0.1:6379/0",
		// time-to-live of cached responses, in seconds
		ttl_seconds: 60
	},
	nominatim: {
		// base url for Nominatim
		url: "https://nominatim.openstreetmap.org/"
	},
	osrm: {
		// base url for OSRM
		url: "http://router.project-osrm.org/"
	}
};
```

NB: At example above you can see default values of options

After that, service could be started by:
``` bash
npm start
```
