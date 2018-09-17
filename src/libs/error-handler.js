var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var check_1 = require('express-validator/check');
var logger_1 = require('./logger');
var logger = logger_1["default"].createLogger(__filename);
// Define error interface
var ErrorWithStatusCode = (function (_super) {
    __extends(ErrorWithStatusCode, _super);
    function ErrorWithStatusCode(msg, statusCode) {
        if (statusCode === void 0) { statusCode = 500; }
        _super.call(this, msg);
        this.readonly = statusCode;
        this.statusCode = statusCode;
    }
    ErrorWithStatusCode.prototype.handle = function (req, res, next) {
        logger.error(this.statusCode + " " + this.stack);
        if (res) {
            res.status(this.statusCode).json({
                statusCode: this.statusCode,
                message: this.message,
                stack: this.stack,
                extra: this.extra
            });
        }
    };
    return ErrorWithStatusCode;
})(Error);
exports.ErrorWithStatusCode = ErrorWithStatusCode;
var InputError = (function (_super) {
    __extends(InputError, _super);
    function InputError(errs) {
        _super.call(this, "Invalid input, " + JSON.stringify(errs.array()), 400);
        this.extra = errs.array();
    }
    return InputError;
})(ErrorWithStatusCode);
exports.InputError = InputError;
function handleValidationErrors(req, res, next) {
    var validationResultObj = check_1.validationResult(req);
    if (!validationResultObj.isEmpty()) {
        return next(new InputError(validationResultObj));
    }
    else {
        return next();
    }
}
exports.handleValidationErrors = handleValidationErrors;
function errorHandler(err, req, res, next) {
    if (err instanceof ErrorWithStatusCode) {
        return err.handle(req, res, next);
    }
    logger.error("500 " + err.stack);
    if (res) {
        var statusCode = 500;
        res.status(statusCode).json({
            statusCode: statusCode,
            message: err.message,
            stack: err.stack
        });
    }
}
exports.errorHandler = errorHandler;
