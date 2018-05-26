// Third-party libs
const path =require('path');
const fs = require('fs');
const express = require('express');
const https = require('https');

// Local libs
const Logger = require(path.join(__dirname, 'libs', 'logger.js'));

// Routing modules
const indexRoutes = require(path.join(__dirname, 'routes', 'index.js'));

// Establish which zone we're running in
let zone = process.env['ZONE'] || 'dev';
if (zone !== 'dev' && zone !== 'staging' && zone !== 'prod') {
	zone = 'dev';
}

// Discover port to listen on
const port = process.env['PORT'] || 3000;

// Create the logger
const logger = new Logger(Logger.makeLabel(__filename));

// Get the SSL keys
const tlsKey = fs.readFileSync('./tls/storage.key.pem');
const tlsCert = fs.readFileSync('./tls/storage.cert.pem');

// Create the express app
const app = express();

// Attach express routes
app.use('/', indexRoutes);

// Start listening for HTTPS requests
const httpsServer = https.createServer({
	key: tlsKey,
	cert: tlsCert
}, app).listen(port, () => {
	logger.info(`Started in ${zone.toUpperCase()} zone listening on port ${port}`);
});
