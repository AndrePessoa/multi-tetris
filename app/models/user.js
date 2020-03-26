const { USERSTATUS } = require('./users');
const { DIR } = require('./piece');

const KEY = { 
	ESC: 27,
	SPACE: 32,
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40
}

const MAX_COMMAND_STACK = 3;

var User = function (socket, color) {
	this.status = USERSTATUS.LOGIN;
	this.id = socket.id;
	this.socket = socket;
	this.color = color;
	this.piece = null;
	this.score = 0;
	this.lastCommands = [];
	this.status = USERSTATUS.LOGIN;

	socket.on('action', function (command) {
		// console.log('User action:', this.id, command);
	});

	console.log('New user: ', color);
};
User.prototype.setPiece = function(piece){
	if(piece) piece.userId = this.id;
	this.piece = piece;
}
User.prototype.setCommand = function (command) {
	if(this.lastCommands.length < MAX_COMMAND_STACK) this.lastCommands.push(command || null);
}
User.prototype.processCommand = function () {
	let result = true;
	this.lastCommands.forEach(lastCommand => {
		switch(lastCommand){
			case KEY.LEFT: result = this.piece.move(DIR.LEFT); break;
			case KEY.RIGHT: result = this.piece.move(DIR.RIGHT); break;
			case KEY.UP: result = this.piece.rotate(); break;
			case KEY.DOWN: result = this.piece.drop(); break;
			default: break;
		}
	});
	this.lastCommands = [];
	return result;
}
User.prototype.setStatus = function (status) {
	this.status = status;
};
User.prototype.addScore = function (points) {
	this.score += points;
};
User.prototype.toJson = function () {
	var json = {};
	json.id = this.id;
	json.status = this.status;
	json.color = this.color;
	json.piece = this.piece;
	json.score = this.score;

	return json;
};
User.prototype.emit = function (ev, data) {
	this.socket.emit(ev, data || this.toJson());
}

module.exports = { User };