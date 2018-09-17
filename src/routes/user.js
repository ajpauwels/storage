// Third-party libs
var express_1 = require('express');
var check_1 = require('express-validator/check');
var MongooseUserModel_1 = require('../models/MongooseUserModel');
// Local libs
var logger_1 = require('../libs/logger');
var error_handler_1 = require('../libs/error-handler');
// Create the logger
var logger = logger_1["default"].createLogger(__filename);
// Get the express router
var router = express_1.Router();
/**
 * Retrieves the specified info fields from the authenticated user
 */
router.get('/info/:namespace', [
    check_1.param('namespace')
        .trim()
        .escape(),
    check_1.query('keys')
        .trim()
        .escape(),
    error_handler_1.handleValidationErrors,
    function (req, res, next) {
        logger.info("Received request for information from '" + res.locals.user.cert.subject.CN + "' (" + res.locals.user.id + ")");
        return next();
    }
], function (req, res, next) {
    var namespaceStr = req.params.namespace;
    var keysStr = req.query.keys;
    // Create the array of info names
    var keyPaths;
    if (typeof (keysStr) === 'string' && keysStr.length > 0) {
        keyPaths = keysStr.split(' ').map(function (keyPath) {
            return "info." + namespaceStr + "." + keyPath;
        });
    }
    return MongooseUserModel_1.default.getUser(res.locals.user.id, keyPaths)
        .then(function (user) {
        if (!user.info || !user.info[namespaceStr]) {
            var err = new error_handler_1.ErrorWithStatusCode("Namespace '" + namespaceStr + "' not found", 404);
            throw err;
        }
        return res.json(user);
    })
        .catch(function (err) {
        return next(err);
    });
});
/**
 * Uses the cert given during TLS mutual authentication to create a new user
 * user in the database.
 * If the given cert has already been added to the store, returns
 * a 409.
 */
router.post('/', function (req, res, next) {
    logger.info("Received request to create new user '" + res.locals.user.cert.subject.CN + "' (" + res.locals.user.id + ")");
    return next();
}, function (req, res, next) {
    // Create the user
    MongooseUserModel_1.default.createUser(res.locals.user.b64Cert)
        .then(function (user) {
        return res.json(user);
    })
        .catch(function (err) {
        return next(err);
    });
});
/**
 * Patches the specified user. Accepts 'info' as a param in the PATCH body.
 * The 'info' param must be an object and is structured as such:
 * {
 *     "info": {
 *         "[namespace]": {
 *             "[field1Name]": [field1Value]
 *             "[field2Name]": {
 *                 "[subField1Name]": [subField1Value]
 *             }
 *             ...
 *         }
 *     }
 * }
 */
router.patch('/', [
    check_1.body('info')
        .custom(function (value) {
        return typeof value === 'object';
    }),
    error_handler_1.handleValidationErrors,
    function (req, res, next) {
        logger.info("Received request to perform a patch on user '" + res.locals.user.cert.subject.CN + "' (" + res.locals.user.id + ")");
        return next();
    }
], function (req, res, next) {
    var patchObj = req.body;
    return MongooseUserModel_1.default.updateUserInfo(res.locals.user.id, patchObj)
        .then(function (user) {
        if (!user) {
            var err = new error_handler_1.ErrorWithStatusCode('User not found', 404);
            throw err;
        }
        logger.info("Successfully updated info for user '" + res.locals.user.cert.subject.CN + "' (" + res.locals.user.id + ")");
        return res.status(200).json({});
    })
        .catch(function (err) {
        return next(err);
    });
});
exports["default"] = router;
