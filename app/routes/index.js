
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

const path = require('path');
const publicFolder = path.resolve(__dirname + '/../../public');

app.use(express.static(publicFolder));

app.get('/', function(req, res){
  res.sendFile(publicFolder + '/mobile.html');
});

app.get('/control', function(req, res){
  res.sendFile(publicFolder + '/mobile.html');
});

http.listen(process.env.PORT || 3000, function(){
	console.log('listening on *:'+(process.env.PORT || 3000));
});

module.exports = { io, http, app };