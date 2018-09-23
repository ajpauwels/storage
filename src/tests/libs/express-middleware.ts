import chai from 'chai';
import ExpressMiddleware from '../../libs/express-middleware';
import { Request, Response, NextFunction } from 'express';
import { spy, stub, SinonSpy } from 'sinon';
import http from 'http';
import fs from 'fs';
import User from '../../models/MongooseUserModel';
import { ErrorWithStatusCode } from '../../libs/error-handler';

const { expect } = chai;

const testerKey = fs.readFileSync('./src/tests/tls/tester.key.pem').toString();
const testerCert = fs.readFileSync('./src/tests/tls/tester.cert.pem').toString();

describe('ExpressMiddleware', function() {
	let mockTLSSocket: any;
	let mockReq: Request, mockRes: Response, nextSpy: SinonSpy;

	before('create mock req, res, and TLS socket', function() {
		mockTLSSocket = {
			getPeerCertificate: stub().returns({
				raw: new Buffer(testerCert)
			}),
			authorized: true
		};
		mockReq = Object.create(http.IncomingMessage.prototype);
		mockRes = Object.create(http.ServerResponse.prototype);
		mockRes.locals = {};
	});

	before('create spies', function() {
		nextSpy = spy();
	});

	afterEach('clear nextSpy history', function() {
		nextSpy.resetHistory();
	});

	describe('#authentication', function() {
		afterEach('clear nextSpy history', function() {
			nextSpy.resetHistory();
		});

		it('should create a local.user object when given TLS details', function() {
			mockReq.socket = mockTLSSocket;
			ExpressMiddleware.authentication(mockReq, mockRes, nextSpy);

			const userID = User.userIDFromCertificate(new Buffer(testerCert).toString('base64'));
			expect(mockRes.locals.user.id).to.equal(userID);

		});

		it('should return a 401 error if TLS details are not provided', function() {
			mockReq.socket = undefined;
			ExpressMiddleware.authentication(mockReq, mockRes, nextSpy);

			expect(nextSpy.calledOnce).to.be.true;
			expect(nextSpy.calledWith(new ErrorWithStatusCode('Cannot read property \'getPeerCertificate\' of undefined', 401)));
		});
	});

	describe('#authorization', function() {
		afterEach('reset spy histories', function() {
			nextSpy.resetHistory();
		});

		it('should call next with no error when authorized', function() {
			mockReq.socket = mockTLSSocket;
			mockTLSSocket.authorized = true;

			ExpressMiddleware.authorization(mockReq, mockRes, nextSpy);

			expect(nextSpy.calledOnce).to.be.true;
			expect(nextSpy.calledWithExactly()).to.be.true;
		});

		it('should call next with no error when not authorized but the path is POST /user[s]?', function() {
			mockReq.socket = mockTLSSocket;
			mockReq.method = 'post';
			mockReq.originalUrl = '/users';
			mockTLSSocket.authorized = false;

			ExpressMiddleware.authorization(mockReq, mockRes, nextSpy);

			expect(nextSpy.calledOnce).to.be.true;
			expect(nextSpy.calledWithExactly()).to.be.true;
		});

		it('should call next with a 403 error when not authorized and path is not non-POST /user[s]?', function() {
			mockReq.socket = mockTLSSocket;
			mockReq.method = 'get';
			mockReq.originalUrl = '/users';
			mockTLSSocket.authorized = false;

			ExpressMiddleware.authorization(mockReq, mockRes, nextSpy);

			expect(nextSpy.calledOnce).to.be.true;
			expect(nextSpy.args[0][0].message).to.be.equal('Certificate not signed by this organization');
			expect(nextSpy.args[0][0].statusCode).to.be.equal(403);
		});
	});
});
