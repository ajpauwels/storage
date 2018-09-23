import chai from 'chai';
import Util from '../../libs/util';

const { expect } = chai;

describe('Util', function() {
	describe('#getPort', function() {
		it('should return the number in the env if the number is a valid port', function() {
			let port;
			process.env['PORT'] = '4000';
			port = Util.getPort();
			expect(port).to.equal(4000);

			process.env['PORT'] = '5000';
			port = Util.getPort();
			expect(port).to.equal(5000);
		});

		it('should return 3000 if the value in the env is not a number', function() {
			let port;
			process.env['PORT'] = 'abc';
			port = Util.getPort();
			expect(port).to.equal(3000);
		});

		it('should return 3000 if the value in the env is an empty string', function() {
			let port;
			process.env['PORT'] = '';
			port = Util.getPort();
			expect(port).to.equal(3000);
		});

		it('should return 3000 if the value in the env is undefined', function() {
			let port;
			process.env['PORT'] = undefined;
			port = Util.getPort();
			expect(port).to.equal(3000);
		});

		it('should return 3000 if the value in the env is greater than 65535', function() {
			let port;
			process.env['PORT'] = '65536';
			port = Util.getPort();
			expect(port).to.equal(3000);
		});

		it('should return 3000 if the value in the env is less than 1', function() {
			let port;
			process.env['PORT'] = '0';
			port = Util.getPort();
			expect(port).to.equal(3000);
		});
	});

	describe('#getZone', function() {
		it('should return \'dev\' when env var \'ZONE\' is set to \'dev\'', function() {
			process.env['ZONE'] = 'dev';

			const zone = Util.getZone();

			expect(zone).to.equal('dev');
		});

		it('should return \'staging\' when env var \'ZONE\' is set to \'staging\'', function() {
			process.env['ZONE'] = 'staging';

			const zone = Util.getZone();

			expect(zone).to.equal('staging');
		});

		it('should return \'prod\' when env var \'ZONE\' is set to \'prod\'', function() {
			process.env['ZONE'] = 'prod';

			const zone = Util.getZone();

			expect(zone).to.equal('prod');
		});

		it('should return \'test\' when env var \'ZONE\' is set to \'test\'', function() {
			process.env['ZONE'] = 'test';

			const zone = Util.getZone();

			expect(zone).to.equal('test');
		});

		it('should return \'prod\' when env var \'ZONE\' is undefined', function() {
			process.env['ZONE'] = undefined;

			const zone = Util.getZone();

			expect(zone).to.equal('prod');
		});

		it('should return \'prod\' when env var \'ZONE\' is set to an unknown value', function() {
			process.env['ZONE'] = 'bla';

			const zone = Util.getZone();

			expect(zone).to.equal('prod');
		});
	});
});
