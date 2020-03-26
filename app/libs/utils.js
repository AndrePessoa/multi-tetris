
function timestamp()           { return new Date().getTime();                             }
function random(min, max)      { return (min + (Math.random() * (max - min)));            }
function randomChoice(choices) { return choices[Math.round(random(0, choices.length-1))]; }

function getServerIP() {
	var os = require('os');
	var ifaces = os.networkInterfaces();

	var IP = null;

	Object.keys(ifaces).forEach( (ifname) => {
		var alias = 0;

		ifaces[ifname].forEach( (iface) => {
			if ('IPv4' !== iface.family || iface.internal !== false) {
			// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
			return;
			}

			if (alias >= 1) {
				// this single interface has multiple ipv4 addresses
				console.log('1',ifname + ':' + alias, iface.address);
				IP = IP || iface.address;
			} else {
				// this interface has only one ipv4 adress
				console.log('2',ifname, iface.address);
				IP = IP || iface.address;
			}
			++alias;
		});
	});
	return IP || '127.0.0.1';
}

module.exports = {
	timestamp,
	random,
	randomChoice,
	getServerIP
}