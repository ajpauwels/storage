// Third-party libs
var mongoose_1 = require('mongoose');
var crypto_1 = require('crypto');
var async = require('async');
var error_handler_1 = require('../libs/error-handler');
// Mongoose data types
var _a = mongoose_1.Schema.Types, ObjectId = _a.ObjectId, String = _a.String, Mixed = _a.Mixed;
 & mongoose_1.Document;
 & mongoose_1.Model();
var UserSchema = new mongoose_1.Schema({
    _id: String,
    cert: String,
    info: Mixed
});
UserSchema.statics.userIDFromCertificate = function (cert) {
    if (typeof (cert) !== 'string' || cert.length < 1) {
        var err = new error_handler_1.ErrorWithStatusCode('Certificate must be a non-empty string', 400);
        throw err;
    }
    // Generate user ID by creating a sha256 hash of the provided cert
    var sha256 = crypto_1.createHash('sha256');
    sha256.update(cert);
    var userID = sha256.digest('hex');
    return userID;
};
UserSchema.statics.getUser = async;
function (userID, select) {
    if (typeof (userID) !== 'string' || userID.length < 1) {
        var err = new error_handler_1.ErrorWithStatusCode('UserID must be a non-empty string', 400);
        throw err;
    }
    var findQuery = User.findById(userID);
    if (Array.isArray(select) && select.length > 0) {
        findQuery.select(select.join(' '));
    }
    return findQuery.exec()
        .then(function (user) {
        if (!user) {
            var err = new error_handler_1.ErrorWithStatusCode("User '" + userID + "' not found", 404);
            throw err;
        }
        return user;
    });
}
;
UserSchema.statics.updateUserInfo = async;
function (userID, patch) {
    if (typeof (userID) !== 'string' || userID.length < 1) {
        var err = new error_handler_1.ErrorWithStatusCode('UserID must be a non-empty string', 400);
        throw err;
    }
    if (!patch || typeof (patch) !== 'object' || Object.keys(patch).length < 1) {
        var err = new error_handler_1.ErrorWithStatusCode('Patch must be a non-empty object', 400);
        throw err;
    }
    return User.findOneAndUpdate({ _id: { $eq: userID } }, patch).exec()
        .then(function (user) {
        if (!user) {
            var err = new error_handler_1.ErrorWithStatusCode("User '" + userID + "' not found", 404);
            throw err;
        }
        return user;
    });
}
;
UserSchema.statics.createUser = async;
function (cert) {
    var user = new User({
        cert: cert
    });
    return user.save();
}
;
UserSchema.pre('save', , this, IUserModel, next);
{
    if (!this.isModified('cert')) {
        return next();
    }
    var id = User.userIDFromCertificate(this.cert);
    this._id = id;
    return next();
}
;
// Error-handling
var handleE11000 = function (err, noop, next) {
    if (err.name === 'MongoError' && err.code === 11000) {
        var formattedErr = new error_handler_1.ErrorWithStatusCode('User with given ID already exists', 409);
        return next(formattedErr);
    }
    else {
        return next(err);
    }
};
UserSchema.post('save', handleE11000);
UserSchema.post('update', handleE11000);
UserSchema.post('findOneAndUpdate', handleE11000);
UserSchema.post('insertMany', handleE11000);
var User = mongoose_1.model('User', UserSchema);
exports["default"] = User;
