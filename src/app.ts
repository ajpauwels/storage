// Third-party libs
import path from 'path';
import fs from 'fs';
import express from 'express';
import https from 'https';
import mongoose from 'mongoose';
import bluebird from 'bluebird';
import { TLSSocket } from 'tls';

// Third-party middleware
import bodyParser from 'body-parser';

// Local libs
import { default as User } from './models/MongooseUserModel';
import Logger from './libs/logger';
const logger = Logger.createLogger(__filename);

// Local middleware
import { errorHandler, ErrorWithStatusCode as Error } from './libs/error-handler';

// Routing modules
import indexRoutes from './routes/index';
import usersRoutes from './routes/user';

// Establish which zone we're running in
let zone = process.env['ZONE'] || 'dev';
if (zone !== 'dev' && zone !== 'staging' && zone !== 'prod') {
	zone = 'prod';
}

// Check if we have our DB_URL
const dbURL = process.env['MONGODB_URL'];
if (!dbURL) {
	const err = new Error('Requires a MONGODB_URL environment variable set to run', 400);
	errorHandler(err);
	process.exit(1);
}

// Setup our DB connection
mongoose.Promise = bluebird;
mongoose.connect(dbURL)
	.then(() => {
		logger.info('Successfully connected to MongoDB');
	})
	.catch((err) => {
		err.statusCode = 500;
		return errorHandler(err);
	});

// Discover port to listen on
const port = process.env['PORT'] || 3000;

// Get the SSL keys
const tlsKey = fs.readFileSync('./tls/storage.key.pem');
const tlsCert = fs.readFileSync('./tls/storage.intermediate.cert.pem');
const caCert = fs.readFileSync('./tls/intermediate.root.cert.pem');

// Create the express app
const app = express();

// Attach JSON and URL-encoded body parsers
app.use(bodyParser.json({
	type: [
		'application/json',
		'application/json-patch+json',
		'application/merge-patch+json'
	]
}));
app.use(bodyParser.urlencoded({ extended: false }));

// Extract the client cert and compute user ID
app.use((req, res, next) => {
	const tlsSocket: TLSSocket = req.socket as TLSSocket;
	const clientCert = tlsSocket.getPeerCertificate();
	const certBuf = clientCert.raw;
	const b64Cert = certBuf.toString('base64');
	const userID = User.userIDFromCertificate(b64Cert);

	res.locals.user = {
		id: userID,
		b64Cert,
		cert: clientCert
	};

	return next();
});

// Reject the request if the cert was not signed by our root cert and the request
// is not a create user request
app.use((req, res, next) => {
	const tlsSocket: TLSSocket = req.socket as TLSSocket;
	const authorized = tlsSocket.authorized;
	const authErr = tlsSocket.authorizationError;

	if (!authorized) {
		const method = req.method.toLowerCase();
		const path = req.originalUrl.toLowerCase();

		logger.debug(`${method}, ${path}`);

		// Is a create user request
		const matchUsersPath = /^\/user[s]?$/;
		if (method === 'post' && matchUsersPath.test(path)) {
			return next();
		} else {
			const err: Error = new Error('Certificate not signed by this organization', 403);
			return next(err);
		}
	} else {
		return next();
	}
});

// Attach express routes
app.use('/', indexRoutes);
app.use('/user[s]?', usersRoutes);

// Attach custom error-handler
app.use(errorHandler);

// Start listening for HTTPS requests
const httpsServer = https.createServer({
	key: tlsKey,
	cert: tlsCert,
	ca: caCert,
	requestCert: true,
	rejectUnauthorized: false,
	secureProtocol: 'TLSv1_2_method',
	ecdhCurve: 'auto'
}, app).listen(port, () => {
	logger.info(`Started in ${zone.toUpperCase()} zone listening on port ${port}`);
});
