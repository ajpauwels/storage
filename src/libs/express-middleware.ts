import bodyParser from 'body-parser';
import express from 'express';
import { ErrorWithStatusCode } from './error-handler';
import User from '../models/MongooseUserModel';
import { TLSSocket } from 'tls';
import { Request, Response, NextFunction } from 'express';
import Logger from './logger';

const logger = Logger.createLogger(__filename);

const ExpressMiddleware: any = {
	authentication: (req: Request, res: Response, next: NextFunction) => {
		try {
			const tlsSocket: TLSSocket = req.socket as TLSSocket;
			const clientCert = tlsSocket.getPeerCertificate();
			const certBuf = clientCert.raw;
			const b64Cert = certBuf.toString('base64');
			const userID = User.userIDFromCertificate(b64Cert);

			res.locals.user = {
				id: userID,
				b64Cert,
				cert: clientCert
			};

			return next();
		} catch (err) {
			const newErr = new ErrorWithStatusCode('Could not extract certificate from TLS request', 401);
			return next(newErr);
		}
	},
	authorization: (req: Request, res: Response, next: NextFunction) => {
		const tlsSocket: TLSSocket = req.socket as TLSSocket;
		const authorized = tlsSocket.authorized;
		const authErr = tlsSocket.authorizationError;

		if (!authorized) {
			const method = req.method.toLowerCase();
			const path = req.originalUrl.toLowerCase();

			logger.debug(`${method}, ${path}`);

			// Is a create user request
			const matchUsersPath = /^\/user[s]?$/;
			if (method === 'post' && matchUsersPath.test(path)) {
				return next();
			} else {
				const err: Error = new ErrorWithStatusCode('Certificate not signed by this organization', 403);
				return next(err);
			}
		} else {
			return next();
		}
	}
}

export default ExpressMiddleware;
