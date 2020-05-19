const express = require('express');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const QRCode = require('qrcode');

const path = require('path');
const logger = require('../libs/logger');
const { getServerIP } = require('../libs/utils');

const publicFolder = path.resolve(`${__dirname}/../../public`);
const processPort = process.env.PORT || 3000;

app.use(express.static(publicFolder));

app.get('/', (req, res) => {
	res.sendFile(`${publicFolder}/index.html`);
});

app.get('/control', (req, res) => {
	res.sendFile(`${publicFolder}/mobile.html`);
});

app.get('/control/qrcode', (req, res) => {
	const host = req.get('host');
	const serverIP = getServerIP();
	const port = processPort !== 8080 ? `:${processPort}` : '';
	const base = host.includes('localhost') ? `http://${serverIP}${port}` : host;
	const URL = `${base}/control/`;
	logger.log('URL', URL);
	QRCode.toString(URL, { type: 'svg' }, (err, string) => {
		if (err) throw err;
		res.set('Content-Type', 'image/svg+xml');
		res.send(string);
	});
});

http.listen(processPort, () => {
	logger.log(`listening on *:${processPort}`);
});

module.exports = { io, http, app };
