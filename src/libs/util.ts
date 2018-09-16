export default class Util {
	static getZone(): string {
		// Establish which zone we're running in
		let zone = process.env['ZONE'] || 'dev';
		const acceptedZones = ['dev', 'staging', 'prod', 'test'];
		if (acceptedZones.indexOf(zone) === -1) {
			zone = 'prod';
		}

		return zone;
	}
}
