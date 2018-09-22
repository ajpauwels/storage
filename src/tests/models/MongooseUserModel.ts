// Third-party libs
import chai from 'chai';
import User from '../../models/MongooseUserModel';
import { SinonSpy, SinonStub, spy, stub } from 'sinon';
import { ErrorWithStatusCode } from '../../libs/error-handler';
import { Certificate } from 'crypto';
import fs from 'fs';
import { createHash } from 'crypto';
import { Errback } from 'express';

const { expect } = chai;

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
		let updateUserInfoSpy: SinonSpy, findOneAndUpdateStub: any;

		before('setup spies and stubs', function() {
			updateUserInfoSpy = spy(User, 'updateUserInfo');
			findOneAndUpdateStub = stub(User, 'findOneAndUpdate');
		});

		after('unwrap spies and stubs', function() {
			updateUserInfoSpy.restore();
			findOneAndUpdateStub.restore();
		});

		afterEach('reset spy and stub history for each test', function() {
			updateUserInfoSpy.resetHistory();
			findOneAndUpdateStub.resetHistory();
		});

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
	});
});
