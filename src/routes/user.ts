// Third-party libs
import { Router, Request, Response, NextFunction } from 'express';
import { param, body, query, header, validationResult, Result } from 'express-validator/check';
import { TLSSocket } from 'tls';
import path from 'path';
import jsonpatch, { validate } from 'fast-json-patch';
import { default as User } from '../models/MongooseUserModel';
import { default as IUser } from '../models/IUser';

// Local libs
import Logger from '../libs/logger';
import { ErrorWithStatusCode, handleValidationErrors } from '../libs/error-handler';
import Util from '../libs/util';

// Create the logger
const logger = Logger.createLogger(__filename);

// Get the express router
const router = Router();

/**
 * Retrieves the specified info fields from the authenticated user
 */
router.get('/info/:key?', [
	param('key')
		.trim()
		.escape(),
	query('keys')
		.trim()
		.escape(),
	handleValidationErrors,
	(req: Request, res: Response, next: NextFunction) => {
		logger.info(`Received request for information from '${res.locals.user.cert.subject.CN}' (${res.locals.user.id})`);
		return next();
	}
], (req: Request, res: Response, next: NextFunction) => {
	const paramKeys: string = req.params.key;
	const queryKeys: string = req.query.keys;

	let keyPaths: string[] = [];
	if (paramKeys) {
		const paramKeyPaths = paramKeys.split(/,[ ]+/).map((keyPath) => {
			return `info.${keyPath}`;
		});

		keyPaths = keyPaths.concat(paramKeyPaths);
	}

	if (queryKeys) {
		const queryKeyPaths = queryKeys.split(/,[ ]+/).map((keyPath) => {
			return `info.${keyPath}`;
		});

		keyPaths = keyPaths.concat(queryKeyPaths);
	}

	return User.getUser(res.locals.user.id, keyPaths)
		.then((user: IUser) => {
			return res.json(user.info);
		})
		.catch((err: ErrorWithStatusCode) => {
			return next(err);
		});
});

/**
 * Uses the cert given during TLS mutual authentication to create a new user
 * user in the database.
 * If the given cert has already been added to the store, returns
 * a 409.
 */
router.post('/', (req: Request, res: Response, next: NextFunction) => {
	logger.info(`Received request to create new user '${res.locals.user.cert.subject.CN}' (${res.locals.user.id})`);
	return next();
}, (req: Request, res: Response, next: NextFunction) => {
	// Create the user
	User.createUser(res.locals.user.b64Cert)
		.then((user) => {
			return res.json(user);
		})
		.catch((err) => {
			return next(err);
		});
});

/**
 * Patches the specified user. Accepts 'info' as a param in the PATCH body.
 * The 'info' param must be an object and is structured as such:
 * {
 *     "info": {
 *         "[namespace]": {
 *             "[field1Name]": [field1Value]
 *             "[field2Name]": {
 *                 "[subField1Name]": [subField1Value]
 *             }
 *             ...
 *         }
 *     }
 * }
 */
router.patch('/', [
	body('info')
		.custom((value) => {
			return typeof value === 'object';
		}),
	handleValidationErrors,
	(req: Request, res: Response, next: NextFunction) => {
		logger.info(`Received request to perform a patch on user '${res.locals.user.cert.subject.CN}' (${res.locals.user.id})`);

		return next();
	}
], (req: Request, res: Response, next: NextFunction) => {
	const patchObj = req.body;

	return User.updateUserInfo(res.locals.user.id, patchObj)
		.then((user) => {
			if (!user) {
				const err = new ErrorWithStatusCode('User not found', 404);
				throw err;
			}

			logger.info(`Successfully updated info for user '${res.locals.user.cert.subject.CN}' (${res.locals.user.id})`);
			return res.status(200).json({});
		})
		.catch((err) => {
			return next(err);
		});
});

export default router;
