// Third-party libs
import { Schema, Document, Model, model } from 'mongoose';
import { createHash } from 'crypto';
import * as async from 'async';
const { ObjectId, String, Mixed } = Schema.Types;

// Local libs
import { default as IUserOriginal } from './IUser';
import { ErrorWithStatusCode } from '../libs/error-handler';

// Merge the user interface with the mongoose Document and Model objects
type IUser = IUserOriginal & Document;
export type UserModel = IUser & Model<IUser>;

const userSchema = new Schema({
	_id: String,
	cert: String,
	info: Mixed,
	aliases: [String]
});

userSchema.statics.userIDFromCertificate = function(cert: string): string {
	if (cert.length < 1) {
		const err = new ErrorWithStatusCode('Cert cannot be empty', 400);

		throw err;
	}

	// Generate user ID by creating a sha256 hash of the provided cert
	const sha256 = createHash('sha256');
	sha256.update(cert);
	const userID = sha256.digest('hex');

	return userID;
};

userSchema.statics.getInfo = function(userID: )

userSchema.statics.getUser = function(userID: string): Promise<IUser> {
	if (userID.length < 1) {
		const err = new ErrorWithStatusCode('Must provide a user ID', 400);

		throw err;
	}

	return User.findById(userID).exec()
		.catch((err: Error) => {
			// Param may not have been an ID, try as an alias
			return this.findOne({ aliases: userID });
		})
		.catch((err: Error) => {
			// Last try, this may have been a public cert, generate an ID from it
			userID = this.userIDFromCertificate(userID);
			return this.findById(userID);
		});
};

userSchema.statics.createUser = function(cert: string, aliases: string[] | string = []): Promise<IUser> {
	if (typeof aliases === 'string') aliases = [aliases];
	const user = new User({
		cert,
		info: {},
		aliases
	});

	if (aliases.length > 0) {
		const orArr = [];
		for (const alias of aliases) {
			orArr.push({ aliases: alias });
		}

		return this.find().or(orArr)
			.then((users: IUser[]) => {
				if (users.length > 0) {
					const err = new ErrorWithStatusCode('One or more aliases already exists', 400);

					throw err;
				}

				return user.save();
			})
			.catch((err: Error) => {
				return user.save();
			});
	}

	return user.save();
};

userSchema.pre('save', (next) => {
	if (!this.isModified('cert')) {
		return next();
	}

	const id = this.userIDFromCertificate(this.cert);
	this._id = id;

	return next();
});

const User: UserModel = model<IUser, UserModel>('User', userSchema);
export default User;

// export default class User implements IUser {
// 	getUser(user: string): User {
// 		// Determine if the given user was an alias
// 		let userID;
// 		const userIDFromAlias = aliasStore[user];
// 		if (Util.isValidString(userIDFromAlias)) {
// 			userID = userIDFromAlias;
// 		} else {
// 			userID = user;
// 		}

// 		// Determine if there is a user under this ID
// 		let userObj = infoStore[userID];

// 		// No user at this ID, assume the passed in value is a public certificate
// 		if (!Util.isValidObject(userObj)) {
// 			userID = userIDFromCertificate(user);
// 			userObj = infoStore[userID];
// 		}

// 		// If user exists, check it has a cert before returning
// 		if (Util.isValidObject(userObj)) {
// 			const userCert = userObj.cert;

// 			if (Util.isValidString(userCert)) {
// 				userObj.id = userID;

// 				return userObj;
// 			}
// 			else {
// 				const err = new Error(`User '${user}' was found but did not have a valid cert`);
// 				err.statusCode = 500;

// 				throw err;
// 			}
// 		}

// 		// No user found
// 		const err = new Error(`User '${user}' was not found`);
// 		err.statusCode = 404;

// 		throw err;
// 	}
// }

// module.exports.getUser = function(user) {
// 	// Check if the parameter given was correct
// 	if (!Util.isValidString(user)) {
// 		const err = new Error('User parameter must be a user alias, a user ID, or the public certificate of a user');
// 		err.statusCode = 400;

// 		throw err;
// 	}
// };

// module.exports.addUser = function(cert, aliases) {
// 	// Check if cert is a valid string
// 	if (!Util.isValidString(cert)) {
// 		const err = new Error('Certificate must be a valid string to create a user');
// 		err.statusCode = 400;

// 		throw err;
// 	}

// 	// Create the user ID
// 	const userID = userIDFromCertificate(cert);

// 	// Check if user exists already before creating
// 	try {
// 		const userObj = getUser(userID);

// 		// User exists
// 		const err = new Error('User already exists');
// 		err.statusCode = 409;

// 		throw err;
// 	} catch (err) {
// 		// User doesn't exist, create it
// 		if (err.statusCode === 404) {
// 			const userObj = {
// 				cert,
// 				info: {},
// 				aliases: []
// 			};

// 			// Add the user to the DB
// 			infoStore[userID] = userObj;

// 			// Build out the return
// 			const retObj = {
// 				user: userObj
// 			};

// 			// If aliases were specified, add them and provide the success/error object
// 			if (aliases) {
// 				retObj.aliases = addAliases(userID, aliases);
// 			}

// 			return retObj;
// 		}

// 		throw err;
// 	}
// };

// module.exports.addAliases = function(user, aliases) {
// 	// Check that the user is a valid string
// 	if (!Util.isValidString(user)) {
// 		const err = new Error('User must be a valid string in order to add an alias');
// 		err.statusCode = 400;

// 		throw err;
// 	}

// 	// Check that the aliases are either a string or an array
// 	if (!Util.isValidString(aliases) && !Util.isValidArray(aliases)) {
// 		const err = new Error('Alias parameter must be a string or an array of strings');
// 		err.statusCode = 400;

// 		throw err;
// 	}

// 	// Get the user
// 	const userObj = getUser(user);

// 	// Check if the aliases array exists and create if not
// 	if (!Util.isValidArray(userObj.aliases)) userObj.aliases = [];

// 	// Convert to an array if the aliases param is a string
// 	if (typeof aliases === 'string') {
// 		aliases = [aliases];
// 	}

// 	// Iterate through all aliases, trying to add each one
// 	const retObj = {
// 		added: [],
// 		notAdded: []
// 	};
// 	for (const alias of aliases) {
// 		// Check if the given alias is a valid string
// 		if (!Util.isValidString(alias)) {
// 			const errObj = { alias, statusCode: 400, message: 'Alias must be a valid string' };
// 			retObj.notAdded.push(errObj);
// 		}
// 		// Check if the alias already exists
// 		else if (Util.isValidString(aliasStore[alias])) {
// 			const errObj = { alias, statusCode: 409, message: 'Alias already exists' };
// 			retObj.notAdded.push(errObj);
// 		}
// 		// Add the alias
// 		else {
// 			userObj.aliases.push(alias);
// 			aliasStore[alias] = userObj.id;
// 			retObj.added.push(alias);
// 		}
// 	}

// 	return retObj;
// };
