export class ResponseError extends Error {
	readonly code: number;
	readonly status: string;

	data?: any;
	constructor(message: string, code: number, status: string, data?: any){
		super(message);
		Error.captureStackTrace(this, this.constructor);
		this.name = this.constructor.name;
		this.code = code;
		this.status = status;
		if (data){
			this.data = data;
		}
	}
}

export class AccessForbidden extends ResponseError {
	constructor(data?: any){
		const message = "Access forbidden";
		super(message, 403, message, data);
	}
}

export class BadRequest extends ResponseError {
	constructor(data?: any){
		const message = "Bad request";
		super(message, 403, message, data);
	}
}

export class NotFound extends ResponseError {
	constructor(data?: any){
		const message = "Not found";
		super(message, 404, message, data);
	}
}
