// Third-party libs
import chai from 'chai';
// import { start, stop } from '../app';
import { start, stop } from '../app';
import mongoose from 'mongoose';
import { spy, stub, SinonSpy, SinonStub } from 'sinon';
import { ErrorWithStatusCode } from '../libs/error-handler';
import fs from 'fs';
import { Server } from 'https';

const { expect } = chai;

// Load the TLS certs and keys for mutual TLS
const caCert = fs.readFileSync('./src/tests/tls/intermediate.root.cert.pem').toString();
const serverKey = fs.readFileSync('./src/tests/tls/server.key.pem').toString();
const serverCert = fs.readFileSync('./src/tests/tls/server.cert.pem').toString();

describe('app', function() {
	describe('#start', function() {
		let connectStub: SinonStub;

		before('create spies', function() {
			connectStub = stub(mongoose, 'connect');
		});

		afterEach('reset spy history', function() {
			connectStub.resetHistory();
		});

		after('restore spies', function() {
			connectStub.restore();
		});

		describe('when env ZONE is not set to \'testing\'', function() {
			describe('and no MONGODB_URL is set', function() {
				it('should throw a 400 error', async function() {
					process.env['ZONE'] = 'prod';
					delete process.env['MONGODB_URL'];

					let err: ErrorWithStatusCode;
					try {
						const server = await start(serverKey, serverCert, caCert);
					} catch (e) {
						err = e;
					}

					expect(err).to.not.be.undefined;
					expect(err.message).to.be.equal('Requires a MONGODB_URL environment variable set to run');
					expect(err.statusCode).to.be.equal(400);
				});
			});

			describe('and a MONGODB_URL is set', function() {
				it('should return an HTTPS server if the connection succeeds', async function() {
					process.env['ZONE'] = 'prod';
					process.env['MONGODB_URL'] = 'goodURL';

					connectStub.resolves();

					const server = await start(serverKey, serverCert, caCert);

					expect(server).to.be.instanceOf(Server);
				});

				it('should throw a 500 error if the connection fails', async function() {
					process.env['ZONE'] = 'prod';
					process.env['MONGODB_URL'] = 'goodURL';

					const thrownError = new ErrorWithStatusCode('Could not connect', 500);
					connectStub.rejects(thrownError);

					let err: ErrorWithStatusCode;
					try {
						const server = await start(serverKey, serverCert, caCert);
					} catch (e) {
						err = e;
					}

					expect(err).to.not.be.undefined;
					expect(err).to.be.instanceOf(ErrorWithStatusCode);
					expect(err.message).to.be.equal(thrownError.message);
					expect(err.statusCode).to.be.equal(thrownError.statusCode);
				});
			});
		});

		describe('when env ZONE is set to \'testing\'', function() {
			before('setup env', function() {
				process.env['ZONE'] = 'testing';
			});

			describe('when no TLS details are provided', function() {
				it('should throw a 400 error', async function() {
					let err: ErrorWithStatusCode;
					try {
						const server = await start(undefined, undefined, undefined);
					} catch (e) {
						err = e;
					}

					expect(err).to.not.be.undefined;
					expect(err.message).to.be.equal('Missing TLS info');
					expect(err.statusCode).to.be.equal(400);
				});
			});

			describe('when TLS details are provided', function() {
				it('should return an HTTPS server', async function() {
					const server: any = await start(serverKey, serverCert, caCert);

					expect(connectStub.calledOnce).to.be.false;
					expect(server).to.be.instanceOf(Server);
					expect(server.key).to.be.equal(serverKey);
					expect(server.cert).to.be.equal(serverCert);
					expect(server.ca).to.be.equal(caCert);
				});
			});

			describe('when httpsServer is already defined', function() {
				it('should call stop on the httpsServer first', async function() {
					let server: any = await start(serverKey, serverCert, caCert);
					const closeSpy: SinonSpy = spy(server, 'close');

					server = await start(serverKey, serverCert, caCert);

					expect(connectStub.calledOnce).to.be.false;
					expect(closeSpy.calledOnce).to.be.true;
				});
			});
		});
	});
});

