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

UserSchema.statics.getUser = function(userID: string, select?: string[]): Promise<IUser> {
	if (userID.length < 1) {
		const err = new ErrorWithStatusCode('Must provide a user ID', 400);

		throw err;
	}

	const findQuery = User.findById(userID);

	if (select && select.length > 0) {
		findQuery.select(select.join(' '));
	}

	return findQuery.exec();
};

UserSchema.statics.updateUserInfo = function(userID: string, patch: any): Promise<IUser> {
	return User.findOneAndUpdate({ _id: { $eq: userID } }, patch).exec();
};

UserSchema.statics.createUser = function(cert: string): Promise<IUser> {
	const user = new User({
		cert
	});

	return user.save();
};

UserSchema.pre('save', function(this: IUserModel, next) {
	if (!this.isModified('cert')) {
		return next();
	}

	const id = User.userIDFromCertificate(this.cert);
	this._id = id;

	return next();
});

// Error-handling
const handleE11000 = (err: MongoError, noop: undefined, next: any) => {
	if (err.name === 'MongoError' && err.code === 11000) {
		const formattedErr = new ErrorWithStatusCode('User with given ID already exists', 409);
		return next(formattedErr);
	} else {
		return next(err);
	}
};

UserSchema.post('save', handleE11000);
UserSchema.post('update', handleE11000);
UserSchema.post('findOneAndUpdate', handleE11000);
UserSchema.post('insertMany', handleE11000);

const User: IUserModel = model<IUserDocument, IUserModel>('User', UserSchema);
export default User;
