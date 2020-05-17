const { USERSTATUS } = require('./users');
const { DIR } = require('./piece');

const KEY = {
	ESC: 27,
	SPACE: 32,
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
};

const MAX_COMMAND_STACK = 3;

class User {
	constructor(socket, color) {
		this.status = USERSTATUS.LOGIN;
		this.id = socket.id;
		this.socket = socket;
		this.color = color;
		this.piece = null;
		this.score = 0;
		this.lastCommands = [];
		this.status = USERSTATUS.LOGIN;

		/*
		socket.on('action', (command) => {
			// console.log('User action:', this.id, command);
		}); */

		// console.log('New user: ', color);
	}

	setPiece(piece) {
		if (piece) piece.userId = this.id;
		this.piece = piece;
	}

	setCommand(command) {
		if (this.lastCommands.length < MAX_COMMAND_STACK) this.lastCommands.push(command || null);
	}

	processCommand() {
		let result = true;
		this.lastCommands.forEach((lastCommand) => {
			switch (lastCommand) {
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

	setStatus(status) {
		this.status = status;
	}

	addScore(points) {
		this.score += points;
	}

	toJson() {
		const json = {};
		json.id = this.id;
		json.status = this.status;
		json.color = this.color;
		json.piece = this.piece;
		json.score = this.score;

		return json;
	}

	emit(ev, data) {
		this.socket.emit(ev, data || this.toJson());
	}
}

module.exports = { User };
