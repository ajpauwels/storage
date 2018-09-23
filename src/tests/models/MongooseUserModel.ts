// Third-party libs
import chai from 'chai';
import { default as User, ErrorHandlers, PreHooks } from '../../models/MongooseUserModel';
import { SinonSpy, SinonStub, spy, stub } from 'sinon';
import { ErrorWithStatusCode } from '../../libs/error-handler';
import { Certificate } from 'crypto';
import fs from 'fs';
import { createHash } from 'crypto';
import { Errback } from 'express';
import { userInfo } from 'os';
import { MongoError } from 'mongodb';
import { race } from 'bluebird';

const { assert, expect } = chai;

const testerCert = fs.readFileSync('./src/tests/tls/tester.cert.pem');

// Pre-made response values
const fullUser = {
	_id: '1d809e203565ce392b7818222e16bf2cce1fb88e667468477dc314a475fe4a22',
	cert: testerCert.toString('base64'),
	info: {
		firstNamespace: {
			firstKey: 'firstVal',
			secondKey: 0,
			thirdKey: [
				false,
				true,
				300,
				0,
				{
					fourthKey: 'fourthVal'
				},
				[
					0.5,
					'abc'
				],
				'abc'
			]
		},
		secondNamespace: {
			'fifthKey': 'fifthVal'
		}
	}
};

describe('PreHooks', function() {
	let preSaveSpy: SinonSpy;

	before('create spies', function() {
		preSaveSpy = spy(PreHooks, 'preSave');
	});

	after('restore spies', function() {
		preSaveSpy.restore();
	});

	describe('#preSave', function() {
		it('should add the _id param to the context if the cert was modified', function() {
			const contextObj: any = {
				isModified: function(cert: string) { return true; },
				cert: fullUser.cert
			};

			PreHooks.preSave.call(contextObj, (err: ErrorWithStatusCode) => {
				const id = User.userIDFromCertificate(contextObj.cert);
				expect(err).to.be.undefined;
				expect(contextObj._id).to.not.be.undefined;
				expect(contextObj._id).to.be.equal(id);
			});
		});

		it('should not modify the context at all if the cert was not modified', function() {
			const contextObj: any = {
				isModified: function(cert: string) { return false; },
				cert: fullUser.cert
			};

			PreHooks.preSave.call(contextObj, (err: ErrorWithStatusCode) => {
				const id = User.userIDFromCertificate(contextObj.cert);
				expect(err).to.be.undefined;
				expect(contextObj._id).to.be.undefined;
			});
		});
	});
});

describe('ErrorHandlers', function() {
	let handleE11000Spy: SinonSpy;

	before('create spies', function() {
		handleE11000Spy = spy(ErrorHandlers, 'handleE11000');
	});

	after('restore spies', function() {
		handleE11000Spy.restore();
	});

	describe('#handleE11000', function() {
		it('should return a 409 error if error is an E11000', function(done) {
			const mongoErr = new MongoError('Mongo error E11000');
			mongoErr.name = 'MongoError';
			mongoErr.code = 11000;

			ErrorHandlers.handleE11000(mongoErr, undefined, (err: ErrorWithStatusCode) => {
				expect(err).to.not.be.undefined;
				expect(err.message).to.equal('User with given ID already exists');
				expect(err.statusCode).to.equal(409);

				return done();
			});
		});

		it('should return the same error as the one given if the error is not an E11000', function(done) {
			const mongoErr = new MongoError('Mongo error not-E11000');
			mongoErr.name = 'MongoError';
			mongoErr.code = 11001;

			ErrorHandlers.handleE11000(mongoErr, undefined, (err: ErrorWithStatusCode) => {
				expect(err).to.not.be.undefined;
				expect(err).to.equal(mongoErr);

				return done();
			});
		});

		it('should return no error at all if none is given', function(done) {
			ErrorHandlers.handleE11000(undefined, undefined, (err: ErrorWithStatusCode) => {
				expect(err).to.be.undefined;

				return done();
			});
		});
	});
});

describe('MongooseUserModel', function() {
	describe('#userIDFromCertificate', function() {
		let userIDFromCertificateSpy: SinonSpy;
		before('wrap userIDFromCertificate in a spy', function() {
			userIDFromCertificateSpy = spy(User, 'userIDFromCertificate');
		});

		after('unwrap userIDFromCertificate', function() {
			userIDFromCertificateSpy.restore();
		});

		afterEach('reset spy history for each test', function() {
			userIDFromCertificateSpy.resetHistory();
		});

		describe('without a valid user certificate', function() {
			it('should return a 400 error when given an empty string', function() {
				let err: ErrorWithStatusCode;
				try {
					userIDFromCertificateSpy('');
				} catch (e) {
					err = e;
				}

				expect(userIDFromCertificateSpy.threw(err)).to.be.true;
				expect(err.message).to.equal('Certificate must be a non-empty string');
				expect(err.statusCode).to.equal(400);
			});

			it('should return a 400 error when given undefined', function() {
				let err: ErrorWithStatusCode;
				try {
					userIDFromCertificateSpy(undefined);
				} catch (e) {
					err = e;
				}

				expect(userIDFromCertificateSpy.threw(err)).to.be.true;
				expect(err.message).to.equal('Certificate must be a non-empty string');
				expect(err.statusCode).to.equal(400);
			});
		});

		describe('with a valid user certificate', function() {
			it('should return a sha256-encoded, hashed value of the user certificate', function() {
				const certHash = createHash('sha256');
				certHash.update(testerCert);
				const userIDForTest = certHash.digest('hex');

				const userID = userIDFromCertificateSpy(testerCert.toString());

				expect(userIDFromCertificateSpy.threw()).to.be.false;
				expect(userID).to.equal(userIDForTest);
			});
		});
	});

	describe('#getUser', function() {
		let getUserSpy: SinonSpy;
		before('wrap getUser in a spy', function() {
			getUserSpy = spy(User, 'getUser');
		});

		after('unwrap getUser', function() {
			getUserSpy.restore();
		});

		afterEach('reset spy history for each test', function() {
			getUserSpy.resetHistory();
		});

		describe('without a valid userID', function() {
			it('should return a 400 error when given an empty string as the userID', async function() {
				let err: ErrorWithStatusCode;
				try {
					const user = await User.getUser('');
				} catch (e) {
					err = e;
				}

				expect(err.message).to.equal('UserID must be a non-empty string');
				expect(err.statusCode).to.equal(400);
			});

			it('should return a 400 error when given undefined as the userID', async function() {
				let err: ErrorWithStatusCode;
				try {
					const user = await User.getUser(undefined);
				} catch (e) {
					err = e;
				}

				expect(err.message).to.equal('UserID must be a non-empty string');
				expect(err.statusCode).to.equal(400);
			});

		});

		describe('with a valid userID', function() {
			let findByIdStub: SinonStub;
			before('make stubs', function() {
				findByIdStub = stub(User, 'findById');
			});

			after('restore stubs', function() {
				findByIdStub.restore();
			});

			describe('with an empty select array', function() {
				it('should resolve with a 404 error indicating userID does not exist', async function() {
					const findByIdResp: undefined = undefined;
					findByIdStub.returns({
						select: stub(),
						exec: stub().returns(new Promise((resolv, reject) => {
							return resolv(findByIdResp);
						}))
					});

					const userID = User.userIDFromCertificate(testerCert.toString());

					let err: ErrorWithStatusCode;
					try {
						const user = await User.getUser(userID);
					} catch (e) {
						err = e;
					}

					expect(err.message).to.equal(`User '${userID}' not found`);
					expect(err.statusCode).to.equal(404);
				});

				it('should resolve with the full user if the ID does exist', async function() {
					findByIdStub.returns({
						select: stub(),
						exec: stub().returns(new Promise((resolv, reject) => {
							return resolv(fullUser);
						}))
					});

					const userID = User.userIDFromCertificate(testerCert.toString());
					const user = await User.getUser(userID);

					expect(user).to.deep.equal(fullUser);
				});
			});

			describe('with a non-empty select array', function() {
				it('should resolve with only the requested parts of the user if the user exists', async function() {
					const partialUserObj = {
						_id: fullUser._id,
						cert: fullUser.cert,
						info: {
							firstNamespace: {
								thirdKey: fullUser.info.firstNamespace.thirdKey
							}
						}
					};

					findByIdStub.returns({
						select: stub(),
						exec: stub().returns(new Promise((resolv, reject) => {
							return resolv(partialUserObj);
						}))
					});

					const userID = User.userIDFromCertificate(testerCert.toString());
					const user = await User.getUser(userID, ['info.firstNamespace.thirdKey']);

					expect(user).to.deep.equal(partialUserObj);
				});

				it('should resolve the entire user if the user exists and the select array is defined but empty', async function() {
					findByIdStub.returns({
						select: stub(),
						exec: stub().returns(new Promise((resolv, reject) => {
							return resolv(fullUser);
						}))
					});

					const userID = User.userIDFromCertificate(testerCert.toString());
					const user = await User.getUser(userID, []);

					expect(user).to.deep.equal(fullUser);
				});
			});
		});
	});

	describe('#updateUserInfo', function() {
		let updateUserInfoSpy: SinonSpy, findOneAndUpdateStub: SinonStub;

		before('setup spies and stubs', function() {
			updateUserInfoSpy = spy(User, 'updateUserInfo');
			findOneAndUpdateStub = stub(User, 'findOneAndUpdate');
		});

		after('unwrap spies and stubs', function() {
			updateUserInfoSpy.restore();
			findOneAndUpdateStub.restore();
		});

		// TODO: Is this necessary?
		// afterEach('reset spy and stub history for each test', function() {
		// 	updateUserInfoSpy.resetHistory();
		// 	findOneAndUpdateStub.resetHistory();
		// });

		describe('with an invalid userID', function() {
			it('should return a 400 error when the userID is an empty string', async function() {
				let err: ErrorWithStatusCode;
				try {
					const user = await User.updateUserInfo('', {});
				} catch (e) {
					err = e;
				}

				expect(err.message).to.equal('UserID must be a non-empty string');
				expect(err.statusCode).to.equal(400);
			});

			it('should return a 400 error when the userID is undefined', async function() {
				let err: ErrorWithStatusCode;
				try {
					const user = await User.updateUserInfo(undefined, {});
				} catch (e) {
					err = e;
				}

				expect(err.message).to.equal('UserID must be a non-empty string');
				expect(err.statusCode).to.equal(400);
			});
		});

		describe('with a valid userID but an invalid patch', function() {
			it('should return a 400 error and indicate the patch must be non-empty', async function() {
				let err: ErrorWithStatusCode;

				try {
					const user = await User.updateUserInfo('someID', {});
				} catch (e) {
					err = e;
				}

				expect(err.message).to.equal('Patch must be a non-empty object');
				expect(err.statusCode).to.equal(400);
			});
		});

		describe('with a userID that doesn\'t exist', function() {
			const findOneAndUpdateResp: undefined = undefined;
			before('setup stub resolutions', function() {
				findOneAndUpdateStub.returns({
					exec: stub().returns(new Promise((resolv, reject) => {
						return resolv(findOneAndUpdateResp);
					}))
				});
			});

			it('should return a 404 error indicating the user was not found', async function() {
				let err: ErrorWithStatusCode;

				try {
					const user = await User.updateUserInfo('invalidID', {
						info: {
							firstNamespace: {
								firstKey: 0
							}
						}
					});
				} catch (e) {
					err = e;
				}

				expect(err.message).to.be.equal('User \'invalidID\' not found');
				expect(err.statusCode).to.be.equal(404);
			});
		});

		describe('with a userID that exists', function() {
			const findOneAndUpdateResp: any = {
				_id: fullUser._id,
				cert: fullUser.cert
			};

			before('setup stub resolutions', function() {
				findOneAndUpdateStub.returns({
					exec: stub().returns(new Promise((resolv, reject) => {
						return resolv(findOneAndUpdateResp);
					}))
				});
			});

			it('should return the user before patching', async function() {
				const userID = User.userIDFromCertificate(testerCert.toString());

				const user = await User.updateUserInfo(userID, {
					info: {
						firstNamespace: {
							firstKey: 'bloop'
						}
					}
				});

				expect(user).to.deep.equal(findOneAndUpdateResp);
			});
		});

		describe('when a DB error occurs', function() {
			const findOneAndUpdateErr = new Error('DB error');

			before('setup stub error throwing', function() {
				findOneAndUpdateStub.returns({
					exec: stub().throws(findOneAndUpdateErr)
				});
			});

			it('should throw a catchable error', async function() {
				const userID = User.userIDFromCertificate(testerCert.toString());

				let err: ErrorWithStatusCode;
				try {
					const user = await User.updateUserInfo(userID, {
						info: {
							firstNamespace: {
								firstKey: 'bloop'
							}
						}
					});
				} catch (e) {
					err = e;
				}

				expect(err).not.to.be.undefined;
				expect(err).to.equal(findOneAndUpdateErr);
			});
		});
	});


	describe('#createUser', function() {
		let createUserSpy: SinonSpy;
		before('wrap createUser in a spy', function() {
			createUserSpy = spy(User, 'createUser');
		});

		after('unwrap createUser', function() {
			createUserSpy.restore();
		});

		describe('without a valid user certificate', function() {
			it('should return a 400 error when given an empty string', async function() {
				let err: ErrorWithStatusCode;
				try {
					const user = await User.createUser('');
				} catch (e) {
					err = e;
				}

				expect(err).not.to.be.undefined;
				expect(err.message).to.equal('Public certificate must be a non-empty string');
				expect(err.statusCode).to.equal(400);
			});
		});

		describe('with a valid user certificate', function() {
			let saveStub: SinonStub;
			const saveResp = {
				_id: fullUser._id,
				cert: fullUser.cert
			};

			before('setup stub error throwing', function() {
				saveStub = stub(User.prototype, 'save');
				saveStub.resolves(saveResp);
			});

			after('restore stub', function() {
				saveStub.restore();
			});

			it('should return a 200 status and the user when given a non-empty string', async function() {
				const user = await User.createUser(fullUser.cert);

				expect(user).to.deep.equal(saveResp);
			});
		});
	});
});
