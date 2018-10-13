import fs from 'fs';

export default class Util {
	static getZone(): string {
		// Establish which zone we're running in
		const envZONE = process.env['ZONE'];
		let zone;

		if (!envZONE || envZONE === 'undefined' || envZONE === 'null') zone = 'prod';
		else zone = envZONE;

		const acceptedZones = ['dev', 'staging', 'prod', 'testing'];
		if (acceptedZones.indexOf(zone) === -1) {
			zone = 'prod';
		}

		return zone;
	}

	static getServerKey(): string {
		const keyPath: string = process.env['SERVER_KEY'];
		if (!keyPath) return undefined;

		return fs.readFileSync(keyPath).toString();
	}

	static getServerCert(): string {
		const certPath: string = process.env['SERVER_CERT'];
		if (!certPath) return undefined;

		return fs.readFileSync(certPath).toString();
	}

	static getServerCAChain(): string {
		const caChainPath: string = process.env['SERVER_CA_CHAIN'];
		if (!caChainPath) return undefined;

		return fs.readFileSync(caChainPath).toString();
	}

	static getPort(): number {
		const parsedEnv = parseInt(process.env['PORT']);

		if (isNaN(parsedEnv)) return 3000;
		if (parsedEnv < 1 || parsedEnv > 65535) return 3000;
		else return parsedEnv;
	}
}
