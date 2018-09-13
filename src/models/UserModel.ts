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
	info: Mixed
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

userSchema.statics.getUser = function(userID: string): Promise<IUser> {
	if (userID.length < 1) {
		const err = new ErrorWithStatusCode('Must provide a user ID', 400);

		throw err;
	}

	return User.findById(userID).exec();
};

userSchema.statics.updateUserInfo = function(userID: string, patch: any) {
	return User.update({ _id: { $eq: userID } }, patch).exec();
};

userSchema.statics.createUser = function(cert: string): Promise<IUser> {
	const user = new User({
		cert
	});

	return user.save();
};

userSchema.pre('save', function(next) {
	if (!this.isModified('cert')) {
		return next();
	}

	const id = User.userIDFromCertificate((<IUser>this).cert);
	this._id = id;

	return next();
});

const User: UserModel = model<IUser, UserModel>('User', userSchema);
export default User;
