// Third-party libs
import { Schema, Document, Model, model } from 'mongoose';
import { createHash } from 'crypto';
import * as async from 'async';

// Local libs
import { default as IUser } from './IUser';
import { ErrorWithStatusCode } from '../libs/error-handler';
import { MongoError } from 'mongodb';

// Mongoose data types
const { ObjectId, String, Mixed } = Schema.Types;

// Merge the user interface with the mongoose Document and Model objects
type IUserDocument = IUser & Document;
type IUserModel = IUserDocument & Model<IUserDocument>;

const UserSchema = new Schema({
	_id: String,
	cert: String,
	info: Mixed
});

UserSchema.statics.userIDFromCertificate = function(cert: string): string {
	if (typeof (cert) !== 'string' || cert.length < 1) {
		const err = new ErrorWithStatusCode('Certificate must be a non-empty string', 400);

		throw err;
	}

	// Generate user ID by creating a sha256 hash of the provided cert
	const sha256 = createHash('sha256');
	sha256.update(cert);
	const userID = sha256.digest('hex');

	return userID;
};

UserSchema.statics.getUser = async function(userID: string, select?: string[]): Promise<IUser> {
	if (typeof (userID) !== 'string' || userID.length < 1) {
		const err = new ErrorWithStatusCode('UserID must be a non-empty string', 400);

		throw err;
	}

	const findQuery = User.findById(userID);
	if (Array.isArray(select) && select.length > 0) {
		findQuery.select(select.join(' '));
	}

	return findQuery.exec()
		.then((user) => {
			if (!user) {
				const err = new ErrorWithStatusCode(`User '${userID}' not found`, 404);
				throw err;
			}

			return user;
		});
};

UserSchema.statics.updateUserInfo = async function(userID: string, patch: any): Promise<IUser> {
	if (typeof (userID) !== 'string' || userID.length < 1) {
		const err = new ErrorWithStatusCode('UserID must be a non-empty string', 400);
		throw err;
	}

	if (!patch || typeof (patch) !== 'object' || Object.keys(patch).length < 1) {
		const err = new ErrorWithStatusCode('Patch must be a non-empty object', 400);
		throw err;
	}

	return User.findOneAndUpdate({ _id: { $eq: userID } }, patch).exec()
		.then((user) => {
			if (!user) {
				const err = new ErrorWithStatusCode(`User '${userID}' not found`, 404);
				throw err;
			}

			return user;
		});
};

UserSchema.statics.createUser = async function(cert: string): Promise<IUser> {
	if (cert.length === 0) {
		const err = new ErrorWithStatusCode('Public certificate must be a non-empty string', 400);
		throw err;
	}

	const user = new User({
		cert
	});

	return user.save();
};

// Pre-hooks
export const PreHooks = {
	preSave: function(this: IUserModel, next: Function) {
		if (!this.isModified('cert')) {
			return next();
		}

		const id = User.userIDFromCertificate(this.cert);
		this._id = id;

		return next();
	}
};

UserSchema.pre('save', PreHooks.preSave);

// Error-handling
export const ErrorHandlers = {
	handleE11000: (err: MongoError, noop: undefined, next: any) => {
		if (!err) return next();
		if (err.name === 'MongoError' && err.code === 11000) {
			const formattedErr = new ErrorWithStatusCode('User with given ID already exists', 409);
			return next(formattedErr);
		} else {
			return next(err);
		}
	}
};

UserSchema.post('save', ErrorHandlers.handleE11000);
UserSchema.post('update', ErrorHandlers.handleE11000);
UserSchema.post('findOneAndUpdate', ErrorHandlers.handleE11000);
UserSchema.post('insertMany', ErrorHandlers.handleE11000);

const User: IUserModel = model<IUserDocument, IUserModel>('User', UserSchema);
export default User;
