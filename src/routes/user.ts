// Third-party libs
import { Router, Request, Response, NextFunction } from 'express';
import { param, body, query, header, validationResult, Result } from 'express-validator/check';
import { TLSSocket } from 'tls';
import path from 'path';
import jsonpatch, { validate } from 'fast-json-patch';
import { default as User } from '../models/UserModel';
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
 * Retrieves the specified info fields from the
 * specified user.
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
 * Adds a user under the specified user ID. If no user ID
 * is provided, it generates one based on the hash of the
 * certificate sent.
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
 * The 'info' param must be an object and can be one of two things:
 * 1. JSON Patch
 *    Specify the 'Content-Type: application/json-patch+json' header. Performs an RFC6902
 *    JSON patch on the user's info object.
 * 2. Merge Patch
 *    Specify the 'Content-Type: application/merge-patch+json' header. Performs an approximation
 *    of the RFC7386 merge patch on the user's info object. Accepts an object which contains just
 *    the values which need to be changed. To delete a key, specify its value as null. The provided
 *    object is compared to an empty object to generate an RFC6902 JSON patch. The patch list is
 *    iterated through and all values set to null are replaced with remove operations. The patch is
 *    then applied to the user's info block.
 */
router.patch('/', [
	body('info')
		.custom((value) => {
			return typeof value === 'object';
		}),
	header('content-type')
		.exists(),
	handleValidationErrors,
	(req: Request, res: Response, next: NextFunction) => {
		const contentTypeHeader = req.headers['content-type'];

		let doJSONPatch: boolean;
		if (contentTypeHeader === 'application/json-patch+json') {
			doJSONPatch = true;
		}
		else if (contentTypeHeader === 'application/merge-patch+json') {
			doJSONPatch = false;
		} else {
			const err = new Error('Content-type header value is invalid', 400);
			return next(err);
		}

		res.locals.doJSONPatch = doJSONPatch;

		return next();
	},
	(req: Request, res: Response, next: NextFunction) => {
		logger.info(`Received request to perform a ${res.locals.doJSONPatch ? 'JSON' : 'merge'} patch on user '${res.locals.user.cert.subject.CN}' (${res.locals.user.id})`);

		return next();
	}
], (req: Request, res: Response, next: NextFunction) => {
	const infoObj = req.body.info;

	return User.getUser(res.locals.user.id)
		.then((user: IUser) => {
			let infoDiff, userInfo;
			userInfo = user.info || {};
			if (res.locals.doJSONPatch) {
				infoDiff = infoObj;
			} else {
				const emptyObj = {};
				infoDiff = jsonpatch.compare(userInfo, infoObj);
			}

			const validationErrors = jsonpatch.validate(infoDiff, userInfo);
			if (validationErrors) {
				const err = new Error(`Failed to validate the patch, patch set: ${JSON.stringify(infoDiff)}, user's info object: ${JSON.stringify(userInfo)}`, 500);

				return next(err);
			}

			const newInfo = jsonpatch.applyPatch(user.info, infoDiff).newDocument;
			user.info = newInfo;

			return User.
		})
		.catch((err: Error) => {
			return next(err);
		});
});

export default router;
