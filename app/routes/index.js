var getServerIP = require('../libs/utils').getServerIP;
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var QRCode = require('qrcode');

const path = require('path');
const publicFolder = path.resolve(__dirname + '/../../public');
const processPort = process.env.PORT || 3000;

app.use(express.static(publicFolder));

app.get('/', function(req, res){
  res.sendFile(publicFolder + '/index.html');
});

app.get('/control', function(req, res){
  res.sendFile(publicFolder + '/mobile.html');
});

app.get('/control/qrcode', function(req, res){
  var host = req.get('host');
  var serverIP = getServerIP();
  var port = processPort !== 8080 ? ':' + processPort : '' ;
  var base = host.includes('localhost') ? 'http://' + serverIP + port : host;
  var URL = base + '/control/';
  console.log('URL', URL);
  QRCode.toString(URL, {type: 'svg'}, function (err, string) {
    if (err) throw err;
    res.set('Content-Type', 'image/svg+xml');
    res.send(string);
  })
});

http.listen(processPort, function(){
	console.log('listening on *:'+(processPort));
});

module.exports = { io, http, app };