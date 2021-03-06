import chai from 'chai';
import fs from 'fs';
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

	describe('#getServerKey', function() {
		it('should return the TLS key when provided with a valid path', function() {
			process.env['SERVER_KEY'] = './src/tests/tls/server.key.pem';
			const serverKey: string = fs.readFileSync('./src/tests/tls/server.key.pem').toString();

			const utilServerKey = Util.getServerKey();

			expect(utilServerKey).to.equal(serverKey);
		});

		it('should return undefined when no path is defined', function() {
			delete process.env['SERVER_KEY'];

			const utilServerKey = Util.getServerKey();
			expect(utilServerKey).to.be.undefined;
		});

		it('should throw an error when no path is defined', function() {
			process.env['SERVER_KEY'] = 'feiufei';

			try {
				const utilServerKey = Util.getServerKey();
			} catch (err) {
				expect(err).to.not.be.undefined;
				expect(err).to.be.instanceOf(Error);
			}
		});
	});

	describe('#getServerCert', function() {
		it('should return the TLS cert when provided with a valid path', function() {
			process.env['SERVER_CERT'] = './src/tests/tls/server.cert.pem';
			const serverCert: string = fs.readFileSync('./src/tests/tls/server.cert.pem').toString();

			const utilServerCert = Util.getServerCert();

			expect(utilServerCert).to.equal(serverCert);
		});

		it('should return undefined when no path is defined', function() {
			delete process.env['SERVER_CERT'];

			const utilServerCert = Util.getServerCert();
			expect(utilServerCert).to.be.undefined;
		});

		it('should throw an error when no path is defined', function() {
			process.env['SERVER_CERT'] = 'feiufheiu';

			try {
				const utilServerCert = Util.getServerCert();
			} catch (err) {
				expect(err).to.not.be.undefined;
				expect(err).to.be.instanceOf(Error);
			}
		});
	});

	describe('#getServerCAChain', function() {
		it('should return the TLS CA chain when provided with a valid path', function() {
			process.env['SERVER_CA_CHAIN'] = './src/tests/tls/intermediate.root.cert.pem';
			const caChain: string = fs.readFileSync('./src/tests/tls/intermediate.root.cert.pem').toString();

			const utilCAChain = Util.getServerCAChain();

			expect(utilCAChain).to.equal(caChain);
		});

		it('should return undefined when no path is defined', function() {
			delete process.env['SERVER_CA_CHAIN'];

			const utilServerCAChain = Util.getServerCAChain();
			expect(utilServerCAChain).to.be.undefined;
		});

		it('should throw an error when an invalid path is defined', function() {
			process.env['SERVER_CA_CHAIN'] = 'frwifheiu';

			try {
				const utilServerKey = Util.getServerKey();
			} catch (err) {
				expect(err).to.not.be.undefined;
				expect(err).to.be.instanceOf(Error);
			}
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

		it('should return \'testing\' when env var \'ZONE\' is set to \'testing\'', function() {
			process.env['ZONE'] = 'testing';

			const zone = Util.getZone();

			expect(zone).to.equal('testing');
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
