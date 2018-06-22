// Third-party libs
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';
import Logger from './logger';

const logger = Logger.createLogger(__filename);

// Define error interface
export class ErrorWithStatusCode extends Error {
	readonly statusCode: number;

	constructor(msg: string, statusCode: number = 500) {
		super(msg);
		this.statusCode = statusCode;
	}
}

export function errorHandler(err: ErrorWithStatusCode, req?: Request, res?: Response, next?: NextFunction) {
	const singleLine = !!process.env['NO_NEWLINES'];

	if (!singleLine) {
		logger.error(`${err.statusCode} ${err.stack}`);
	} else {
		const errArr = err.stack.split('\n    ');
		logger.error(`${err.statusCode} ${errArr.join(' -> ')}`);
	}

	if (res) {
		res.status(err.statusCode).json({
			statusCode: err.statusCode,
			message: err.message,
			stack: err.stack
		});
	}
}
