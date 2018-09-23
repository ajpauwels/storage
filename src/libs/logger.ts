// Third-party libs
import * as path from 'path';
import * as fs from 'fs';

// Local libs
import Util from './util';

// Extract relevant functions from Winston
import { Logger as WinstonLogger, LoggerOptions, createLogger, format, transports } from 'winston';
const { combine, label, timestamp, colorize, printf } = format;

export default class Logger {
	/**
	 * Creates the logger object.
	 *
	 * @param {String} filepath Call this function from any file and pass in
	 *                          `__filename` as the parameter
	 * @returns {WinstonLogger} Winston logging object
	 */
	static createLogger(filePath?: string, logLevel: string = 'debug'): WinstonLogger {
		logLevel = process.env['LOG_LEVEL'] || logLevel;

		const labelStr = Logger.makeLabel(filePath);

		return createLogger({
			format: combine(
				label({ label: labelStr }),
				timestamp(),
				colorize(),
				printf((info) => {
					if (typeof info.label === 'undefined' || !info.label) {
						return `${info.timestamp} [${info.level}] ${info.message}`;
					} else {
						return `${info.timestamp} [${info.level}] [${info.label}] ${info.message}`;
					}
				})
			),
			level: logLevel,
			transports: [
				new transports.Console({
					silent: Util.getZone() === 'test'
				})
			]
		});
	}

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
	static makeLabel(filepath?: string): string {
		if (!filepath || typeof (filepath) !== 'string') return '';
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
	}
}

