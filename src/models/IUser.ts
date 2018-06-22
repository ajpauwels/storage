export interface IUserData {
	_id: string;
	cert: string;
	info: { [key: string]: any };
	aliases: string[];
}

export default interface IUser extends IUserData {
	/**
	 * Retrieves the specified user from the user store.
	 *
	 * @param {string} userID Identifying document of the user, this may be any of the following:
	 *                      1. Alias of the user to modify
	 *                      2. User ID of the user to modify (hash of the public cert)
	 *                      3. Public certificate of the user
	 * @returns {Promise<IUser>} Return an IUser type object on success
	 * @throws 400 Bad Request if user parameter is not a valid string
	 * @throws 404 Not Found if user not found
	 * @throws 500 Internal Server Error if user was found but it did not have a valid cert
	 */
	getUser(userID: string): Promise<IUser>;

	/**
	 * Creates the specified user in the user store.
	 *
	 * @param {String} cert Public certificate of the user to add
	 * @param {String|String[]} [aliases] Alias(es) to associate with the user
	 * @returns {Promise<IUser>} Contains two fields: user and aliases. The user field contains the user object
	 *                   exactly as it appears in the database. The aliases field provides the response
	 *                   from the addAliases call if aliases were provided.
	 * @throws 400 Bad Request if the cert is not a valid string
	 * @throws 409 Conflict if user already exists
	 */
	createUser(cert: string, aliases?: string & string[]): Promise<IUser>;

	/**
	 * Adds one or more aliases to the specified user if it exists
	 *
	 * @param {String} user Identifying document of the user, this may be any of the following:
	 *                      1. Alias of the user to modify
	 *                      2. User ID of the user to modify (hash of the public cert)
	 *                      3. Public certificate of the user
	 * @param {String|Array} aliases One or more aliases to add to the specified user
	 * @returns {Object} Contains two fields: added and notAdded. The added field is an array of
	 *                   strings containing all the aliases that were added to the user. The notAdded
	 *                   field is an array of objects, each of which contains an alias, statusCode, and
	 *                   message field. These give you the aliases that weren't added and why.
	 * @throws 400 Bad Request is user param is not a string or aliases is not a string or array
	 * @throws 404 Not Found if user doesn't exist
	 */
	addAliases(user: string, aliases: string & string[]): string[];

	/**
	 * Creates a user ID from a public certificate. Currently, this means
	 * creating a sha256 hash of the public certificate.
	 *
	 * @param {String} cert Public certificate to process into an ID
	 * @returns {String} User ID
	 * @throws 400 Bad Request if the cert is not a valid string
	 */
	userIDFromCertificate(cert: string): string;
}
