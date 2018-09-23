export default class Util {
	static getZone(): string {
		// Establish which zone we're running in
		const envZONE = process.env['ZONE'];
		let zone;

		if (!envZONE || envZONE === 'undefined' || envZONE === 'null') zone = 'prod';
		else zone = envZONE;

		const acceptedZones = ['dev', 'staging', 'prod', 'test'];
		if (acceptedZones.indexOf(zone) === -1) {
			zone = 'prod';
		}

		return zone;
	}

	static getPort(): number {
		const parsedEnv = parseInt(process.env['PORT']);

		if (isNaN(parsedEnv)) return 3000;
		if (parsedEnv < 1 || parsedEnv > 65535) return 3000;
		else return parsedEnv;
	}
}
