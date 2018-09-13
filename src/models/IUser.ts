export interface IUserData {
	_id: string;
	cert: string;
	info: { [key: string]: any };
}

export default interface IUser extends IUserData {
	/**
	 * Retrieves the specified user from the user store.
	 *
	 * @param {string} userID ID of the user to retrieve info from
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
	 * @returns {Promise<IUser>} Contains the user object exactly as it appears in the database
	 * @throws 400 Bad Request if the cert is not a valid string
	 * @throws 409 Conflict if user already exists
	 */
	createUser(cert: string): Promise<IUser>;

	/**
	 * Creates a user ID from a public certificate. Currently, this means
	 * creating a sha256 hash of the public certificate.
	 *
	 * @param {String} cert Public certificate to process into an ID
	 * @returns {String} User ID
	 * @throws 400 Bad Request if the cert is not a valid string
	 */
	userIDFromCertificate(cert: string): string;

	/**
	 * Updates the info portion of the user.
	 *
	 * @param {String} userID ID of the user to modify the info of
	 * @param {Mixed} patch RFC6902 JSON patch object
	 * @returns {Promise<IUser>} Contains the user object exactly as it appears in the database
	 * @throws 400 Bad Request if the patch is not a valid path
	 * @throws 404 Not Found if user not found
	 */
	updateUserInfo(userID: string, patch: any): Promise<IUser>;
}
