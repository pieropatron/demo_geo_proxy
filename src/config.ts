export default {
	restapi: {
		port: 3000,
		worker_count: 0
	},
	basic_auth: {
		user: 'user',
		pass: 'pass'
	},
	jwt_auth: {
		key: 'key',
		iss: 'iss',
		expires: '1m'
	},
	redis: {
		url: "redis://127.0.0.1:6379/0",
		ttl_seconds: 60
	},
	nominatim: {
		url: "https://nominatim.openstreetmap.org/"
	},
	osrm: {
		url: "http://router.project-osrm.org/"
	}
};
