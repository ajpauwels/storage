// Third-party libs
import chai from 'chai';
import Logger from '../../libs/logger';
// import { Logger as WinstonLogger } from 'winston';
import * as winston from 'winston';

const { expect } = chai;

describe('Logger', function() {
	describe('#createLogger', function() {
		it('should return a valid WinstonLogger instance with level set to debug when none given', function() {
			const logger = Logger.createLogger(__filename);
			logger.info('debug');

			expect(logger.format).to.not.be.undefined;
			expect(logger.level).to.equal('debug');
			expect(logger.transports).to.not.be.undefined;
			expect(logger.transports.length).to.equal(1);
		});

		it('should return a valid WinstonLogger instance with level set to info when info given', function() {
			const logger = Logger.createLogger(__filename, 'info');
			logger.info('test');

			expect(logger.format).to.not.be.undefined;
			expect(logger.level).to.equal('info');
			expect(logger.transports).to.not.be.undefined;
			expect(logger.transports.length).to.equal(1);
		});

		it('should not include the label when none given', function() {
			const logger = Logger.createLogger(undefined, 'info');
			logger.info('info');

			expect(logger.format).to.not.be.undefined;
			expect(logger.level).to.equal('info');
			expect(logger.transports).to.not.be.undefined;
			expect(logger.transports.length).to.equal(1);
		});
	});

	describe('#makeLabel', function() {
		it('should return a path to the file from the package.json directory as a label when given a valid path', function() {
			const label = Logger.makeLabel(__filename);

			expect(label).to.be.equal('src/tests/libs/logger.ts');
		});

		it('should return an empty string when given an empty string', function() {
			const label = Logger.makeLabel('');

			expect(label).to.be.equal('');
		});

		it('should return the given string when the string is not a path', function() {
			const badPath = 'fhjik 3 32k k32knjkniu3nr';
			const label = Logger.makeLabel(badPath);

			expect(label).to.be.equal(badPath);
		});
	});
});
