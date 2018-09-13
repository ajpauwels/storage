// Third-party libs
import { Router, Request, Response, NextFunction } from 'express';
import { param, body, query, header, validationResult, Result } from 'express-validator/check';
import { TLSSocket } from 'tls';
import path from 'path';
import jsonpatch, { validate } from 'fast-json-patch';
import { default as User, UserModel } from '../models/UserModel';
import { default as IUser } from '../models/IUser';

// Local libs
import Logger from '../libs/logger';
import { ErrorWithStatusCode as Error, InputError, handleValidationErrors } from '../libs/error-handler';

// Create the logger
const logger = Logger.createLogger(__filename);

// Get the express router
const router = Router();

interface IInfoReturn {
	found: { [key: string]: any };
	notFound: string[];
}

/**
 * Retrieves the specified info fields from the authenticated user
 */
router.get('/info/:namespace', [
	param('namespace')
		.isAlphanumeric()
		.trim()
		.escape(),
	query('names')
		.isAlphanumeric()
		.trim()
		.escape(),
	handleValidationErrors,
	(req: Request, res: Response, next: NextFunction) => {
		logger.info(`Received request for information from '${res.locals.user.cert.subject.CN}' (${res.locals.user.id})`);
		return next();
	}
], (req: Request, res: Response, next: NextFunction) => {
	const namespaceStr: string = req.params.namespace;
	const infoNamesStr: string = req.query.names;

	// Create the array of info names
	const infoNamesArr: string[] = infoNamesStr.split(',');

	return User.getUser(res.locals.user.id)
		.then((user: IUser) => {
			if (!user) {
				const err = new Error(`User '${res.locals.user.cert.subject.CN}' (${res.locals.user.id}) not found`, 404);
				throw err;
			}

			if (!user.info || !user.info[namespaceStr]) {
				const err = new Error(`Namespace '${namespaceStr}' not found`, 404);
				throw err;
			}

			const returnObj: IInfoReturn = {
				found: {},
				notFound: []
			};

			for (const infoName of infoNamesArr) {
				const infoValue: string = user.info[infoName];

				if (!infoValue || typeof infoValue !== 'string') {
					returnObj.notFound.push(infoName);
				} else {
					returnObj.found[infoName] = infoValue;
				}
			}

			return res.json(returnObj);
		})
		.catch((err: Error) => {
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
		.then((user: IUser) => {
			res.json(user);
		})
		.catch((err: Error) => {
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
		.then(() => {
			logger.info(`Successfully updated info for user '${res.locals.user.cert.subject.CN}' (${res.locals.user.id})`);

			return res.status(200).json({});
		})
		.catch((err) => {
			return next(err);
		});
});

export default router;
