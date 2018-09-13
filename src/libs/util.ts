// Local libs
import { ErrorWithStatusCode } from './error-handler';

export default class Util {
	/**
	 * Seeks out the given array of key names and returns the value
	 * if it exists in the given object.
	 *
	 * @param {Object} obj Object to traverse
	 * @param {Array} keyPath Each element of the array should be the next key
	 *                        to traverse in the object
	 * @param {Object} returnObj Used during recursive call, stores the result
	 *                           as its being created
	 * @returns {Object} Object with just the requested keypath
	 * @throws 404 Not Found if key in keypath not found
	 */
	static traverseObject(obj: any, keyPath: string[]): any {
		const returnObj: any = {};

		let sourceHolder: any = obj;
		let outputHolder: any = returnObj;

		let lastKey;
		for (const key of keyPath) {
			if (sourceHolder[key] !== undefined) {
				if (lastKey) {
					if (Array.isArray(sourceHolder)) {
						if (Array.isArray(outputHolder)) lastKey = 0;
						outputHolder[lastKey] = [];
					} else {
						if (Array.isArray(outputHolder)) lastKey = 0;
						outputHolder[lastKey] = {};
					}

					outputHolder = outputHolder[lastKey];
				}

				sourceHolder = sourceHolder[key];
			} else {
				throw new ErrorWithStatusCode(`Keypath '${keyPath.join('.')}' does not exist`, 404);
			}

			lastKey = key;
		}

		if (Array.isArray(outputHolder)) lastKey = 0;
		outputHolder[lastKey] = sourceHolder;

		return returnObj;
	}
}
