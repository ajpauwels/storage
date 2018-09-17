// Third-party libs
var path = require('path');
var fs = require('fs');
// Local libs
var util_1 = require('./util');
// Extract relevant functions from Winston
var winston_1 = require('winston');
var combine = winston_1.format.combine, label = winston_1.format.label, timestamp = winston_1.format.timestamp, colorize = winston_1.format.colorize, printf = winston_1.format.printf;
var Logger = (function () {
    function Logger() {
    }
    /**
     * Creates the logger object.
     *
     * @param {String} filepath Call this function from any file and pass in
     *                          `__filename` as the parameter
     * @returns {WinstonLogger} Winston logging object
     */
    Logger.createLogger = function (filePath, logLevel) {
        if (logLevel === void 0) { logLevel = 'debug'; }
        logLevel = process.env['LOG_LEVEL'] || logLevel;
        var labelStr = Logger.makeLabel(filePath);
        return winston_1.createLogger({
            format: combine(label({ label: labelStr }), timestamp(), colorize(), printf(function (info) {
                if (typeof info.label === 'undefined' || info.label === null) {
                    return info.timestamp + " [" + info.level + "] " + info.message;
                }
                else {
                    return info.timestamp + " [" + info.level + "] [" + info.label + "] " + info.message;
                }
            })),
            level: logLevel,
            transports: [
                new winston_1.transports.Console({
                    silent: util_1["default"].getZone() === 'test'
                })
            ]
        });
    };
    /**
     * Creates a label for a logger based on the given absolute
     * path to the file that the logger is being created for.
     * From the path, it traverses up the directory structure
     * until it finds the nearest directory that has a package.json.
     * It considers this directory to be the root directory and creates
     * a label which consists of the path from the root directory
     * down to the file.
     *
     * @param {String} filepath Call this function from any file and pass in
     *                          `__filename` as the parameter
     * @returns {String} Label for the logger
     */
    Logger.makeLabel = function (filepath) {
        var filename = path.basename(filepath);
        var pathParts = filepath.split('/');
        var pathStr;
        for (var i = pathParts.length - 1; i > 0 && !pathStr; --i) {
            var basePath = pathParts.slice(0, i).join('/');
            var pathToCheck = path.join(basePath, 'package.json');
            if (fs.existsSync(pathToCheck)) {
                pathStr = basePath;
            }
        }
        if (!pathStr) {
            return filename;
        }
        else {
            var label_1 = filepath.slice(pathStr.length + 1, filepath.length);
            return label_1;
        }
    };
    return Logger;
})();
exports["default"] = Logger;
