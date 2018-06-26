// Third-party libs
import { Router, Request, Response, NextFunction } from 'express';
import { param, body, query, header } from 'express-validator/check';
import path from 'path';
import jsonpatch from 'fast-json-patch';
import { default as User } from '../models/UserModel';
import { default as IUser } from '../models/IUser';

// Local libs
import Logger from '../libs/logger';
import { ErrorWithStatusCode as Error } from '../libs/error-handler';

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
	param('userIDOrAlias')
		.isAlphanumeric()
		.isLength({ min: 1 })
		.trim()
		.escape(),
	param('namespace')
		.isAlphanumeric()
		.isLength({ min: 1 })
		.trim()
		.escape(),
	query('names')
		.isAlphanumeric()
		.isLength({ min: 1 })
		.trim()
		.escape(),
	header('I-Am-Alias')
		.isAlphanumeric()
		.isLength({ min: 1 })
		.trim()
		.optional(),
	header('I-Am-PubCert')
		.isAlphanumeric()
		.isLength({ min: 1 })
		.trim()
		.optional(),
	header('I-Am-ID')
		.isAlphanumeric()
		.isLength({ min: 1 })
		.trim()
		.optional(),
	header('Signature')
		.isAlphanumeric()
		.isLength({ min: 1 })
		.trim(),
	(req: Request, res: Response, next: NextFunction) => {
		logger.info(`Received request for information from '${req.params.userIDOrAlias}'`);
		return next();
	}
], (req: Request, res: Response, next: NextFunction) => {
	const userIDOrAlias: string = req.params.userIDOrAlias;
	const namespaceStr: string = req.params['namespace'];
	const infoNamesStr: string = req.query.names;

	// Create the array of info names
	const infoNamesArr: string[] = infoNamesStr.split(',');

	return User.getUser(userIDOrAlias)
		.then((user: IUser) => {
			if (!user) {
				const err = new Error(`User '${userIDOrAlias}' not found`, 404);
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
router.post('/:alias?', (req: Request, res: Response, next: NextFunction) => {
	// Retrieve the alias if given and the POST'ed certificate
	const paramAlias = req.params.alias;
	const queryAliasesStr = req.query.aliases;
	let finalAliases;
	const cert = req.body.cert;

	// Announce request
	if (paramAlias && paramAlias.length > 0) {
		finalAliases = paramAlias;
		logger.info(`Received request to create new user with alias '${paramAlias}'`);
	}
	else if (queryAliasesStr && queryAliasesStr.length > 0) {
		const queryAliasesArr = queryAliasesStr.split(',');
		finalAliases = queryAliasesArr;
		logger.info(`Received request to create new user with the following aliases: ${queryAliasesArr}`);
	} else {
		logger.info('Received request to create new user without any aliases');
	}

	// Create the user
	User.createUser(cert, finalAliases)
		.then((user: IUser) => {
			res.json(user);
		})
		.catch((err: Error) => {
			return next(err);
		});
});

/**
 * Patches the specified user. Accepts 'info' and 'aliases' params in the
 * PATCH body. The 'info' param must be an object and can be one of two things:
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
 * The 'aliases' param is an object where each element has a key which is an alias string and the
 * value of that key is either true or false. If the value is true, the alias represented by the
 * key string will be kept/added. Otherwise, the alias will be removed if it exists.
 * This way, you can selectively add or remove aliases without having to provide the original array.
 */
router.patch('/:userIDOrAlias', [
	param('userIDOrAlias')
		.isAlphanumeric()
		.isLength({ min: 1 })
		.trim()
		.escape()
], (req: Request, res: Response, next: NextFunction) => {
	const userIDOrAlias = req.params.userIDOrAlias;
	const infoObj = req.body.info;
	const aliasesDiff = req.body.aliases;

	const contentTypeHeader = req.headers['content-type'];

	if (!contentTypeHeader) {
		const err = new Error('Missing content-type header specifying patch type', 400);
		return next(err);
	}

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

	logger.info(`Received request to perform a ${doJSONPatch ? 'JSON' : 'merge'} patch on user '${userIDOrAlias}'`);

	if (!infoObj && !aliasesDiff) {
		const err = new Error('Missing patch information', 400);
		return next(err);
	}

	return User.getUser(userIDOrAlias)
		.then((user: IUser) => {
			const ignoredFields: string[] = [];

			if (infoObj) {
				let infoDiff;
				if (doJSONPatch) {
					infoDiff = infoObj;
				} else {
					const emptyObj = {};
					infoDiff = jsonpatch.compare(user.info, infoObj);
				}

				const validationErrors = jsonpatch.validate(infoDiff, user.info);
				if (validationErrors) {
					const err = new Error(`Failed to validate the patch. \
    Patch set: ${JSON.stringify(infoDiff)}
    User's info object: ${JSON.stringify(user.info)}`, 500);

					return next(err);
				}
			}

			if (aliasesDiff) {
				for (const alias in aliasesDiff) {
					const keepAlias = aliasesDiff[alias];

					// if (keepAlias) {
					// 	addAli;
					// }
				}
			}

			return res.json({ ignoredFields });
		})
		.catch((err: Error) => {
			return next(err);
		});
});

export default router;
