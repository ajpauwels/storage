// Third-party libs
const path = require('path');
const fs = require('fs');

// Extract relevant functions from Winston
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, colorize } = format;

const Logger = function (labelString) {
	// Create a custom log formatter
	const logFormatter = printf((info) => {
		if (typeof info.label === 'undefined' || info.label === null) {
			return `${info.timestamp} [${info.level}] ${info.message}`;
		} else {
			return `${info.timestamp} [${info.level}] [${info.label}] ${info.message}`;
		}
		
	});

	// Determine logging level
	const logLevel = process.env['LOG_LEVEL'] || 'debug';

	// Create our logger
	const logger = createLogger({
		format: combine(
			label({ label: labelString }),
			timestamp(),
			colorize(),
			logFormatter
		),
		level: logLevel,
		transports: [
			new transports.Console()
		]
	});

	return logger;
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
	const filename = path.basename(filepath);
	const pathParts = filepath.split('/');
	let pathStr;

	for (let i = pathParts.length - 1; i > 0 && !pathStr; --i) {
		const basePath = pathParts.slice(0, i).join('/');
		const pathToCheck = path.join(basePath, 'package.json');

		if (fs.existsSync(pathToCheck)) {
			pathStr = basePath;
		}
	}

	if (!pathStr) {
		return filename;
	} else {
		const label = filepath.slice(pathStr.length + 1, filepath.length);

		return label;
	}
};

module.exports = Logger;
