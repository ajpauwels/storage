// Third-party libs
import chai from 'chai';
import { start as startServer, stop as stopServer } from '../../app';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { SinonStub, stub } from 'sinon';

// Local libs
import User from '../../models/MongooseUserModel';
import { ErrorWithStatusCode } from '../../libs/error-handler';
import Util from '../../libs/util';

// Load the TLS certs and keys for mutual TLS
const caCert = fs.readFileSync('./src/tests/tls/intermediate.root.cert.pem');
const serverKey = fs.readFileSync('./src/tests/tls/server.key.pem');
const serverCert = fs.readFileSync('./src/tests/tls/server.cert.pem');
const testerKey = fs.readFileSync('./src/tests/tls/tester.key.pem');
const testerCert = fs.readFileSync('./src/tests/tls/tester.cert.pem');

const port = Util.getPort();

// Start the express app
startServer(serverKey, serverCert, caCert);

// Extract the expect lib out of Chai
const { expect } = chai;

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

describe('GET /users/info/:namespace', function() {
	describe('with a mutual TLS certificate signed by the server\'s CA', function() {
		let fetchOpts: any, httpsAgent: https.Agent;

		before('set up HTTPS agent', function() {
			httpsAgent = new https.Agent({
				ca: caCert,
				key: testerKey,
				cert: testerCert
			});
		});

		before('create fetch options object', function() {
			fetchOpts = {
				agent: httpsAgent
			};
		});

		describe('where the certificate has a registered user', function() {
			describe('with a namespace that exists', function() {
				describe('without any provided keypaths in the \'keys\' GET param', async function() {
					const getUserStubResp = fullUser;
					let getUserStub: SinonStub;

					before('set up stubs', function() {
						getUserStub = stub(User, 'getUser');
						getUserStub.resolves(getUserStubResp);
					});

					after('restore stubs', function() {
						getUserStub.restore();
					});

					it('should return a 200 with the full user', async function() {
						const res = await fetch(`https://localhost:${port}/users/info/firstNamespace`, fetchOpts);
						const responseJSON = await res.json();

						expect(responseJSON).to.deep.equal(getUserStubResp);
						expect(res.status).to.equal(200);
					});
				});

				describe('with one provided keypath in the \'keys\' GET param', async function() {
					const getUserStubResp = {
						_id: fullUser._id,
						cert: fullUser.cert,
						info: {
							firstNamespace: {
								firstKey: fullUser.info.firstNamespace.firstKey
							}
						}
					};
					let getUserStub: SinonStub;

					before('set up stubs', function() {
						getUserStub = stub(User, 'getUser');
						getUserStub.resolves(getUserStubResp);
					});

					after('restore stubs', function() {
						getUserStub.restore();
					});

					it('should return a 200 with the user object containing the one provided keypath', async function() {
						const res = await fetch(`https://localhost:${port}/users/info/firstNamespace?keys=firstKey`, fetchOpts);
						const responseJSON = await res.json();

						expect(responseJSON).to.deep.equal(getUserStubResp);
						expect(res.status).to.equal(200);
					});
				});

				describe('with more than one provided keypath in the \'keys\' GET param', async function() {
					const getUserStubResp = {
						_id: fullUser._id,
						cert: fullUser.cert,
						info: {
							firstNamespace: {
								firstKey: fullUser.info.firstNamespace.firstKey,
								secondKey: fullUser.info.firstNamespace.secondKey,
								thirdKey: fullUser.info.firstNamespace.thirdKey
							}
						}
					};
					let getUserStub: SinonStub;

					before('set up stubs', function() {
						getUserStub = stub(User, 'getUser');
						getUserStub.resolves(getUserStubResp);
					});

					after('restore stubs', function() {
						getUserStub.restore();
					});

					it('should return a 200 with the user object containing all of the provided keypaths', async function() {
						const res = await fetch(`https://localhost:${port}/users/info/firstNamespace?keys=firstKey secondKey thirdKey`, fetchOpts);
						const responseJSON = await res.json();

						expect(responseJSON).to.deep.equal(getUserStubResp);
						expect(res.status).to.equal(200);
					});
				});

				describe('with a keypath that uses dot-notation', function() {
					const getUserStubResp = {
						_id: fullUser._id,
						cert: fullUser.cert,
						info: {
							firstNamespace: {
								thirdKey: [
									fullUser.info.firstNamespace.thirdKey[4]
								]
							}
						}
					};
					let getUserStub: SinonStub;

					before('set up stubs', function() {
						getUserStub = stub(User, 'getUser');
						getUserStub.resolves(getUserStubResp);
					});

					after('restore stubs', function() {
						getUserStub.restore();
					});

					it('should return a 200 with the user object containing only the portion of the info requested', async function() {
						const res = await fetch(`https://localhost:${port}/users/info/firstNamespace?keys=firstKey secondKey thirdKey`, fetchOpts);
						const responseJSON = await res.json();

						expect(responseJSON).to.deep.equal(getUserStubResp);
						expect(res.status).to.equal(200);
					});
				});

				describe('with a keypath that exists and a keypath that doesn\'t exist', function() {
					const getUserStubResp = {
						_id: fullUser._id,
						cert: fullUser.cert,
						info: {
							firstNamespace: {
								thirdKey: fullUser.info.firstNamespace.thirdKey
							}
						}
					};
					let getUserStub: SinonStub;

					before('set up stubs', function() {
						getUserStub = stub(User, 'getUser');
						getUserStub.resolves(getUserStubResp);
					});

					after('restore stubs', function() {
						getUserStub.restore();
					});

					it('should return a 200 with the user object containing the keypath that exists and no reference to the one which doesn\'t', async function() {
						const res = await fetch(`https://localhost:${port}/users/info/firstNamespace?keys=firstKey bloop`, fetchOpts);
						const responseJSON = await res.json();

						expect(responseJSON).to.deep.equal(getUserStubResp);
						expect(res.status).to.equal(200);
					});
				});
			});

			describe('with a namespace that doesn\'t exist', function() {
				const getUserStubResp = {
					_id: fullUser._id,
					cert: fullUser.cert
				};
				let getUserStub: SinonStub;

				before('set up stubs', function() {
					getUserStub = stub(User, 'getUser');
					getUserStub.resolves(getUserStubResp);
				});

				after('restore stubs', function() {
					getUserStub.restore();
				});

				it('should return a 404 error and indicate the namespace could not be found', async function() {
					const res = await fetch(`https://localhost:${port}/users/info/badNamespace`, fetchOpts);
					const responseJSON = await res.json();

					expect(responseJSON.message).to.equal('Namespace \'badNamespace\' not found');
					expect(res.status).to.equal(404);
				});
			});
		});

		describe('where the certificate does not have a registered user', function() {
			const getUserStubErr: ErrorWithStatusCode = new ErrorWithStatusCode('User \'userID\' not found', 404);
			let getUserStub: SinonStub;

			before('set up stubs', function() {
				getUserStub = stub(User, 'getUser');
				getUserStub.rejects(getUserStubErr);
			});

			after('restore stubs', function() {
				getUserStub.restore();
			});

			it('should return a 404 error and indicate the user could not be found', async function() {
				const res = await fetch(`https://localhost:${port}/users/info/badNamespace`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON.message).to.equal(getUserStubErr.message);
				expect(res.status).to.equal(404);
			});
		});

		describe('where the database returns an error', function() {
			const getUserStubError = new Error('Database threw an error');
			let getUserStub: SinonStub;

			before('set up stubs', function() {
				getUserStub = stub(User, 'getUser');
				getUserStub.rejects(getUserStubError);
			});

			after('restore stubs', function() {
				getUserStub.restore();
			});

			it('should return a 500 error with an error message', async function() {
				const res = await fetch(`https://localhost:${port}/users/info/firstNamespace`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON.message).to.equal(getUserStubError.message);
				expect(res.status).to.equal(500);
			});
		});
	});
});

describe('POST /users', function() {
	describe('with a mutual TLS certificate signed by the server\'s CA', function() {
		let fetchOpts: any, httpsAgent: https.Agent;

		before('set up HTTPS agent', function() {
			httpsAgent = new https.Agent({
				ca: caCert,
				key: testerKey,
				cert: testerCert
			});
		});

		before('create fetch options object', function() {
			fetchOpts = {
				agent: httpsAgent,
				method: 'post'
			};
		});

		describe('where the database encounters an error', function() {
			const createUserStubErr = new ErrorWithStatusCode('Broke DB', 500);
			let createUserStub: SinonStub;

			before('set up stubs', function() {
				createUserStub = stub(User, 'createUser');
				createUserStub.rejects(createUserStubErr);
			});

			after('restore stubs', function() {
				createUserStub.restore();
			});

			it('should return a 500 response and an error message', async function() {
				const res = await fetch(`https://localhost:${port}/users`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON.message).to.equal(createUserStubErr.message);
				expect(res.status).to.equal(500);
			});
		});

		describe('where the user doesn\'t exist', function() {
			const createUserStubResp = {
				_id: fullUser._id,
				cert: fullUser.cert
			};
			let createUserStub: SinonStub;

			before('set up stubs', function() {
				createUserStub = stub(User, 'createUser');
				createUserStub.resolves(createUserStubResp);
			});

			after('restore stubs', function() {
				createUserStub.restore();
			});

			it('should return a 200 response and the created user object', async function() {
				const res = await fetch(`https://localhost:${port}/users`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON).to.deep.equal(createUserStubResp);
			});
		});

		describe('where the user exists', function() {
			const createUserStubErr = new ErrorWithStatusCode('User exists', 409);
			let createUserStub: SinonStub;

			before('set up stubs', function() {
				createUserStub = stub(User, 'createUser');
				createUserStub.rejects(createUserStubErr);
			});

			after('restore stubs', function() {
				createUserStub.restore();
			});

			it('should return a 409 response and indicate the user already exists', async function() {
				const res = await fetch(`https://localhost:${port}/users`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON.message).to.equal(createUserStubErr.message);
				expect(res.status).to.equal(409);
			});
		});
	});
});

describe('PATCH /users', function() {
	describe('with a mutual TLS certificate signed by the server\'s CA', function() {
		let fetchOpts: any, httpsAgent: https.Agent;

		before('set up HTTPS agent', function() {
			httpsAgent = new https.Agent({
				ca: caCert,
				key: testerKey,
				cert: testerCert
			});
		});

		before('create fetch options object', function() {
			fetchOpts = {
				agent: httpsAgent,
				method: 'patch',
				body: JSON.stringify(fullUser),
				headers: { 'Content-Type': 'application/json' }
			};
		});

		describe('where the request does not have an \'info\' param', function() {
			before('remove \'info\' from the patch body', function() {
				const bodyCopy = JSON.parse(JSON.stringify(fullUser));
				delete bodyCopy.info;

				fetchOpts.body = JSON.stringify(bodyCopy);
			});

			after('restore \'info\' to the patch body', function() {
				fetchOpts.body = JSON.stringify(fullUser);
			});

			it('should return a 400 response and indicate a field is missing', async function() {
				const res = await fetch(`https://localhost:${port}/users`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON.message).to.equal('Invalid input, [{\"location\":\"body\",\"param\":\"info\",\"msg\":\"Invalid value\"}]');
				expect(res.status).to.equal(400);
			});
		});

		describe('where the user doesn\'t exist', function() {
			const updateUserInfoStubResp: undefined = undefined;
			let updateUserInfoStub: SinonStub;

			before('set up stubs', function() {
				updateUserInfoStub = stub(User, 'updateUserInfo');
				updateUserInfoStub.resolves(updateUserInfoStubResp);
			});

			after('restore stubs', function() {
				updateUserInfoStub.restore();
			});

			it('should return a 404 response and indicate the user does not exist', async function() {
				const res = await fetch(`https://localhost:${port}/users`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON.message).to.equal('User not found');
				expect(res.status).to.equal(404);
			});
		});

		describe('where the user exists', function() {
			const updateUserInfoStubResp = fullUser;
			let updateUserInfoStub: SinonStub;

			before('set up stubs', function() {
				updateUserInfoStub = stub(User, 'updateUserInfo');
				updateUserInfoStub.resolves(updateUserInfoStubResp);
			});

			after('restore stubs', function() {
				updateUserInfoStub.restore();
			});

			it('should return a 200 response and empty JSON body', async function() {
				const res = await fetch(`https://localhost:${port}/users`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON).to.deep.equal({});
				expect(res.status).to.equal(200);
			});
		});

		describe('where the database encounters an error', function() {
			const updateUserInfoStubErr = new Error('DB error');
			let updateUserInfoStub: SinonStub;

			before('set up stubs', function() {
				updateUserInfoStub = stub(User, 'updateUserInfo');
				updateUserInfoStub.rejects(updateUserInfoStubErr);
			});

			after('restore stubs', function() {
				updateUserInfoStub.restore();
			});

			it('should return a 500 response and an error message', async function() {
				const res = await fetch(`https://localhost:${port}/users`, fetchOpts);
				const responseJSON = await res.json();

				expect(responseJSON.message).to.equal(updateUserInfoStubErr.message);
				expect(res.status).to.equal(500);
			});
		});
	});
});
