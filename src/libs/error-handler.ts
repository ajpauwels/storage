// Third-party libs
import * as path from 'path';
import { Request, Response, NextFunction } from 'express';
import { validationResult, Result } from 'express-validator/check';
import Logger from './logger';
import * as mongoose from 'mongoose';

const logger = Logger.createLogger(__filename);

// Define error interface
export class ErrorWithStatusCode extends Error {
	readonly statusCode: number;
	extra: any;

	constructor(msg?: string, statusCode: number = 500) {
		super(msg);
		this.statusCode = statusCode;
	}

	handle(req?: Request, res?: Response, next?: NextFunction) {
		logger.error(`${this.statusCode} ${this.stack}`);

		if (res) {
			res.status(this.statusCode).json({
				statusCode: this.statusCode,
				message: this.message,
				stack: this.stack,
				extra: this.extra
			});
		}
	}
}

export function handleValidationErrors(req?: any, res?: Response, next?: NextFunction) {
	const validationResultObj: Result = validationResult(req);

	if (!validationResultObj.isEmpty()) {
		const err = new ErrorWithStatusCode(`Invalid input, ${JSON.stringify(validationResultObj.array())}`, 400);
		return next(err);
	} else {
		return next();
	}
}

export function errorHandler(err: Error, req?: Request, res?: Response, next?: NextFunction) {
	if (err instanceof ErrorWithStatusCode) {
		return err.handle(req, res, next);
	}

	logger.error(`500 ${err.stack}`);

	if (res) {
		const statusCode = 500;

		res.status(statusCode).json({
			statusCode,
			message: err.message,
			stack: err.stack
		});
	}
}
