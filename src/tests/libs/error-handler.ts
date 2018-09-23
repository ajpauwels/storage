// Third-party libs
import http from 'http';
import chai from 'chai';
import { ErrorWithStatusCode, handleValidationErrors, errorHandler } from '../../libs/error-handler';
import { stub, spy, SinonStub, SinonSpy } from 'sinon';
import { Response, Request } from 'express';
import * as validate from 'express-validator/check';
import { validationResult, Result } from 'express-validator/check';

const { expect } = chai;

describe('#errorHandler', function() {
	let nextSpy: SinonSpy;
	let mockReq: Request, mockRes: Response;

	before('create spies', function() {
		nextSpy = spy();
	});

	before('create req and res object', function() {
		mockReq = Object.create(http.IncomingMessage.prototype);
		mockRes = Object.create(http.ServerResponse.prototype);
	});

	afterEach('reset spy histories', function() {
		nextSpy.resetHistory();
	});
	
	describe('when the err is an instance of ErrorWithStatusCode', function() {
		it('should call the handle function on the error with req, res, next', function() {
			const err = new ErrorWithStatusCode('not found', 404);
			const handleSpy = spy();
			err.handle = handleSpy;

			errorHandler(err, mockReq, mockRes, nextSpy);
			
			expect(handleSpy.calledOnce).to.be.true;
			expect(handleSpy.calledOnceWith(mockReq, mockRes, nextSpy)).to.be.true;
		});
	});

	describe('when the err is an unrecognized error', function() {
		let jsonStub: SinonStub;
		
		before('create res.status', function() {
			jsonStub = stub();

			mockRes.status = stub().returns({
				json: jsonStub
			});
		});

		it('should give a JSON response with a 500 status code', function() {
			const err = new Error('generic error');

			errorHandler(err, mockReq, mockRes, nextSpy);

			expect(jsonStub.calledOnce).to.be.true;
			expect(jsonStub.calledWithMatch({
				statusCode: 500,
				message: err.message,
				stack: err.stack
			})).to.be.true;
		});
	});

	describe('when req, res, and next are not defined and the error is a generic error', function() {
		it('should do nothing', function() {
			const err = new Error('generic error');

			errorHandler(err);
		});
	});
});

describe('#handleValidationErrors', function() {
	let nextSpy: SinonSpy;
	let mockReq: any;

	before('create spies', function() {
		nextSpy = spy();
	});

	afterEach('reset spy history', function() {
		nextSpy.resetHistory();
	});

	it('should call next with no arguments if there are no errors', function() {
		mockReq = Object.create(http.IncomingMessage.prototype);
		handleValidationErrors(mockReq, undefined, nextSpy);

		expect(nextSpy.calledOnce).to.be.true;
		expect(nextSpy.calledOnceWith()).to.be.true;
	});

	it('should call next with a 400 error and message if there are errors', function() {
		// Attach validation errors
		mockReq = Object.create(http.IncomingMessage.prototype);
		mockReq._validationErrors = [
			{
				location: 'body',
				param: 'info',
				msg: 'Invalid value'
			}
		];

		const err = new ErrorWithStatusCode(`Invalid input, ${JSON.stringify(mockReq._validationErrors)}`, 400);

		handleValidationErrors(mockReq, undefined, nextSpy);

		const returnedErr: any[] = nextSpy.args[0];
		expect(nextSpy.calledOnce).to.be.true;
		expect(returnedErr).to.not.be.undefined;
		expect(returnedErr[0]).to.not.be.undefined;
		expect(returnedErr[0].message).to.equal(err.message);
		expect(returnedErr[0].statusCode).to.equal(err.statusCode);
	});
});

describe('ErrorWithStatusCode', function() {
	describe('#constructor', function() {
		it('should return a fully defined ErrorWithStatusCode when given a string message and number code', function() {
			const err = new ErrorWithStatusCode('not found', 404);
			expect(err).to.be.instanceOf(ErrorWithStatusCode);
			expect(err.message).to.equal('not found');
			expect(err.statusCode).to.equal(404);
		});

		it('should return an ErrorWithStatusCode with an empty string as message and a 500 status code when neither was provided', function() {
			const err = new ErrorWithStatusCode();
			expect(err).to.be.instanceOf(ErrorWithStatusCode);
			expect(err.message).to.equal('');
			expect(err.statusCode).to.equal(500);
		});
	});

	describe('#handle', function() {
		let statusStub: SinonStub, jsonStub: SinonStub;

		before('create stubs', function() {
			statusStub = stub();
			jsonStub = stub();

			statusStub.returns({
				json: jsonStub
			});
		});

		it('calls the status and json stubs with the error parameters', function() {
			// This is just plain old cheating when it comes to TypeScript, but it allows us
			// to pass in an arbitrary object as the response object for the test
			const resObj: Response = <Response>new Object({
				status: statusStub
			});

			const expectedStatusMsg = 'not found';
			const expectedStatusCode = 400;
			const err = new ErrorWithStatusCode(expectedStatusMsg, expectedStatusCode);
			err.extra = { a: 'a' };

			const handleSpy = spy(err, 'handle');
			err.handle(undefined, resObj, undefined);

			expect(statusStub.calledOnceWith(400)).to.be.true;
			expect(jsonStub.calledWithMatch({
				statusCode: expectedStatusCode,
				message: expectedStatusMsg,
				stack: err.stack,
				extra: {
					a: 'a'
				}
			})).to.be.true;
		});

		it('does nothing if not given the res param', function() {
			const err = new ErrorWithStatusCode('not found', 404);
			const nextSpy = spy();
			err.handle(undefined, undefined, nextSpy);

			expect(nextSpy.calledOnce).to.be.false;
		});
	});
});
