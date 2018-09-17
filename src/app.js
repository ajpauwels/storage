var fs_1 = require('fs');
var express_1 = require('express');
var https_1 = require('https');
var mongoose_1 = require('mongoose');
var bluebird_1 = require('bluebird');
var tls_1 = require('tls');
// Third-party middleware
var body_parser_1 = require('body-parser');
// Local libs
var util_1 = require('./libs/util');
var MongooseUserModel_1 = require('./models/MongooseUserModel');
var logger_1 = require('./libs/logger');
var logger = logger_1["default"].createLogger(__filename);
// Local middleware
var error_handler_1 = require('./libs/error-handler');
// Routing modules
var index_1 = require('./routes/index');
var user_1 = require('./routes/user');
// Check if we have our DB_URL
var dbURL = process.env['MONGODB_URL'];
if (!dbURL) {
    var err = new error_handler_1.ErrorWithStatusCode('Requires a MONGODB_URL environment variable set to run', 400);
    error_handler_1.errorHandler(err);
    process.exit(1);
}
// Setup our DB connection
mongoose_1["default"].Promise = bluebird_1["default"];
mongoose_1["default"].connect(dbURL)
    .then(function () {
    logger.info('Successfully connected to MongoDB');
})
    .catch(function (err) {
    err.statusCode = 500;
    return error_handler_1.errorHandler(err);
});
// Discover port to listen on
var port = process.env['PORT'] || 3000;
// Create the express app
var app = express_1["default"]();
// Attach JSON and URL-encoded body parsers
app.use(body_parser_1["default"].json({
    type: [
        'application/json',
        'application/json-patch+json',
        'application/merge-patch+json'
    ]
}));
app.use(body_parser_1["default"].urlencoded({ extended: false }));
// Extract the client cert and compute user ID
app.use(function (req, res, next) {
    try {
        var tlsSocket = req.socket, as = tls_1.TLSSocket;
        var clientCert = tlsSocket.getPeerCertificate();
        var certBuf = clientCert.raw;
        var b64Cert = certBuf.toString('base64');
        var userID = MongooseUserModel_1["default"].userIDFromCertificate(b64Cert);
        res.locals.user = {
            id: userID,
            b64Cert: b64Cert,
            cert: clientCert
        };
        return next();
    }
    catch (err) {
        var newErr = new error_handler_1.ErrorWithStatusCode('Could not extract certificate from TLS request', 401);
        return next(newErr);
    }
});
// Reject the request if the cert was not signed by our root cert and the request
// is not a create user request
app.use(function (req, res, next) {
    var tlsSocket = req.socket, as = tls_1.TLSSocket;
    var authorized = tlsSocket.authorized;
    var authErr = tlsSocket.authorizationError;
    if (!authorized) {
        var method = req.method.toLowerCase();
        var path_1 = req.originalUrl.toLowerCase();
        logger.debug(method + ", " + path_1);
        // Is a create user request
        var matchUsersPath = /^\/user[s]?$/;
        if (method === 'post' && matchUsersPath.test(path_1)) {
            return next();
        }
        else {
            var err = new error_handler_1.ErrorWithStatusCode('Certificate not signed by this organization', 403);
            return next(err);
        }
    }
    else {
        return next();
    }
});
// Attach express routes
app.use('/', index_1["default"]);
app.use('/user[s]?', user_1["default"]);
// Attach custom error-handler
app.use(error_handler_1.errorHandler);
// Get the SSL keys
var tlsKey = fs_1["default"].readFileSync('./tls/storage.key.pem');
var tlsCert = fs_1["default"].readFileSync('./tls/storage.cert.pem');
var caCert = fs_1["default"].readFileSync('./tls/intermediate.root.cert.pem');
// Declare the server
var httpsServer;
// Start the server with the given TLS certs
start(tlsKey, tlsCert, caCert);
/**
 * Starts the server listening on the env-specified port
 * with the given TLS params.
 *
 * @param {Buffer} tlsKey Server's TLS key
 * @param {Buffer} tlsCert Server's TLS certificate signed by CA
 * @param {Buffer} caChain Chain of CA certs back to the root CA
 * @returns {void}
 */
function start(tlsKey, tlsCert, caChain) {
    if (httpsServer)
        stop();
    httpsServer = https_1["default"].createServer({
        key: tlsKey,
        cert: tlsCert,
        ca: caCert,
        requestCert: true,
        rejectUnauthorized: false,
        secureProtocol: 'TLSv1_2_method',
        ecdhCurve: 'auto'
    }, app).listen(port, function () {
        logger.info("Started in " + util_1["default"].getZone().toUpperCase() + " zone listening on port " + port);
    });
}
exports.start = start;
/**
 * Stops and closes the server connection.
 *
 * @returns {void}
 */
function stop() {
    httpsServer.close();
}
exports.stop = stop;
