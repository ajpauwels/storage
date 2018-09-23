// Third-party libs
import chai from 'chai';
import { start as startServer, stop as stopServer } from '../../app';
import Util from '../../libs/util';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import https from 'https';

// Load the TLS certs and keys for mutual TLS
const caCert = fs.readFileSync('./src/tests/tls/intermediate.root.cert.pem').toString();
const serverKey = fs.readFileSync('./src/tests/tls/server.key.pem').toString();
const serverCert = fs.readFileSync('./src/tests/tls/server.cert.pem').toString();
const testerKey = fs.readFileSync('./src/tests/tls/tester.key.pem').toString();
const testerCert = fs.readFileSync('./src/tests/tls/tester.cert.pem').toString();
const unsignedKey = fs.readFileSync('./src/tests/tls/unsigned.key.pem').toString();
const unsignedCert = fs.readFileSync('./src/tests/tls/unsigned.cert.pem').toString();

// Load the port number to use
const port = Util.getPort();

// Start the express app
startServer(serverKey, serverCert, caCert);

// Extract the expect lib out of Chai
const { expect } = chai;

describe('GET /', function() {
	describe('without any mutual TLS certificate', function() {
		it('should return a 401 and indicate the certificate could not be retrieved', async function() {
			const res = await fetch(`https://localhost:${port}/`, {
				agent: new https.Agent({
					ca: caCert
				})
			});

			const responseJSON = await res.json();
			expect(responseJSON.message).to.equal('Could not extract certificate from TLS request');
			expect(res.status).to.equal(401);
		});
	});

	describe('with a mutual TLS certificate not signed by the server\'s CA', function() {
		it('should return a 403 and indicate the certificate was not signed', async function() {
			const res = await fetch(`https://localhost:${port}/`, {
				agent: new https.Agent({
					ca: caCert,
					key: unsignedKey,
					cert: unsignedCert
				})
			});

			const responseJSON = await res.json();
			expect(responseJSON.message).to.equal('Certificate not signed by this organization');
			expect(res.status).to.equal(403);
		});
	});

	describe('with a mutual TLS certificate signed by the server\'s CA', function() {
		it('should return a 200 with a text body saying "Up and running"', async function() {
			const res = await fetch(`https://localhost:${port}/`, {
				agent: new https.Agent({
					ca: caCert,
					key: testerKey,
					cert: testerCert
				})
			});

			const responseText = await res.text();
			expect(responseText).to.equal('Up and running');
			expect(res.status).to.equal(200);
		});
	});
});
