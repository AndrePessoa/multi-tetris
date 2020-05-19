
const timestamp = () => new Date().getTime();
const random = (min, max) => (min + (Math.random() * (max - min)));
const randomChoice = (choices) =>	choices[Math.round(random(0, choices.length - 1))];

const getServerIP = () => {
	const os = require('os');
	const ifaces = os.networkInterfaces();

	let IP = null;

	Object.keys(ifaces).forEach((ifname) => {
		let alias = 0;

		ifaces[ifname].forEach((iface) => {
			if (iface.family !== 'IPv4' || iface.internal !== false) {
			// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
				return;
			}

			if (alias >= 1) {
				// this single interface has multiple ipv4 addresses
				IP = IP || iface.address;
			} else {
				// this interface has only one ipv4 adress
				IP = IP || iface.address;
			}
			++alias;
		});
	});
	return IP || '127.0.0.1';
};

module.exports = {
	timestamp,
	random,
	randomChoice,
	getServerIP,
};
