const logger = require('../libs/logger');
const { timestamp } = require('../libs/utils');
const { User } = require('../models/user');
const Grid = require('./grid');
const Block = require('../models/block');
const { users, USERSTATUS } = require('../models/users');
const pieces = require('../models/pieces');
const configs = require('../config/grid_config');

class Game {
	constructor() {
		this._loop = null;
		this.playing = false;
		this.socket = null;
		//
		this.score = 0;
		this.vscore = 0;
		this.removedRows = 1;
		this.grid = (new Grid(configs.height, configs.width));
	}

	//
	newUser(socket, color) {
		const newUser = new User(socket, color);
		users.addUser(newUser);
		newUser.socket.join('room');
		newUser.setStatus(this.playing ? USERSTATUS.PLAYING : USERSTATUS.READY);
	}

	removeUser(socket) {
		users.removeUser(socket);
		this.emit('user disconnected');
	}

	onUserCommand(socket, command) {
		const user = users.getById(socket.id);
		if (user) {
			user.setCommand(command);
		} else {
			switch (command) {
			case 27: this.gameover(); break;
			case 32: this.start(); break;
			default: break;
			}
		}
	}

	start() {
		if (!this.playing) {
			this.reset();
			this.grid.reset();
			this.createBaseBlocks();
			this.playing = true;
		}
	}

	gameover() {
		this.playing = false;
	}

	setSocket(socket) {
		if (this._loop) clearTimeout(this._loop);
		if (socket) {
			logger.info('Gaming socket setted', socket.id);
			this.run();
		} else {
			logger.info('Removing game socket');
		}
		this.socket = socket;
	}

	createBaseBlocks() {
		/* this.grid.freezeBlocks([
			new Block({x: 0, y: 20, color: 'grey'}),
			new Block({x: 1, y: 20, color: 'grey'}),
			new Block({x: 2, y: 20, color: 'grey'}),
			new Block({x: 3, y: 20, color: 'grey'}),
			new Block({x: 0, y: 19, color: 'grey'}),
			new Block({x: 0, y: 19, color: 'grey'}),
			new Block({x: 1, y: 19, color: 'grey'}),
			new Block({x: 2, y: 19, color: 'grey'}),
			new Block({x: 2, y: 18, color: 'grey'}),
			new Block({x: 1, y: 18, color: 'grey'})
		]); */
		const blocks = [];
		let rate = 0.9;
		const decreaseRate = 0.2;
		const height = 3;
		for (let y = this.grid.height; y >= this.grid.height - height; --y) {
			for (let x = 0; x < this.grid.width; ++x) {
				if (Math.random() < rate) {
					blocks.push(new Block({ x, y, color: 'grey' }));
				}
			}
			rate -= decreaseRate;
		}
		this.grid.freezeBlocks(blocks);
	}

	framePlaying(last) {
		const now = timestamp();
		pieces.update(Math.min(1, (now - last) / 1000.0));
		// using requestAnimationFrame have to be able to handle large delta's
		// caused when it 'hibernates' in a background or non-visible tab

		const completedLines = this.grid.removeLines();
		this.removedRows += completedLines.rows;
		this.score += completedLines.removedBlocks.length;
		const grid = this.grid.snapshot();
		users.current().forEach((user) => {
			// manager user piece
			if (!user.piece) {
				const newPiece = pieces.randomPiece(user.color);
				user.setPiece(newPiece);
				user.piece.x = Math.round(Math.random() * (this.grid.width - 4));
				user.piece.y = -2;
			}
			user.piece.unoccupied = (blocks) => !grid.occupied(blocks);
			user.processCommand();
			if (!user.piece.drop()) {
				const blocks = user.piece.getBlocks();
				const isLast = blocks.findIndex((block) => block.y < 1) > -1;

				if (isLast) this.gameover();

				this.grid.freezeBlocks(blocks);
				grid.addBlocks(user.piece.getBlocks());
				user.setPiece(null);
			} else {
				grid.addBlocks(user.piece.getBlocks());
			}
			// manager user points
			user.addScore(completedLines.removedBlocks.filter((b) => b.user_id === user.id).length);

			user.emit('user-render');
		});

		return {
			now,
			grid,
		};
	}

	run() {
		if (this.playing) return false;
		let last = timestamp();
		const now = last;
		logger.info('run', last);
		const frame = () => {
			logger.info('playing', this.playing);
			if (this.playing) {
				const {
					nowActual,
					grid,
				} = this.framePlaying(last);
				last = nowActual;
				this.render(nowActual, grid);
			} else {
				this.render(now, this.grid.blocks);
			}
			this._loop = setTimeout(() => {
				this.update();
				frame();
			}, 1000 / configs.framerate);
		};

		// reset();  // reset the per-game variables
		frame(); // start the first frame
	}

	render(now, grid) {
		if (this.socket) {
			const renderObj = {
				now,
				blocks: grid.bitmap,
				score: this.score,
				vscore: this.vscore,
				rows: this.removedRows,
				users: users.list.length,
				/*
				dx: dx,
				dy: dy,
				actions: actions,
				playing: playing,
				dt: dt,
				current: current,
				next: next,
				color( users.current() || { color:false } ).color,
				step: step
				*/
			};
			this.socket.emit('ping');
			this.socket.emit('render', renderObj);
		}
	}

	emit(event, args) {
		if (this.socket) this.socket.emit(event, args);
	}

	update() {
		if (this.playing) { // update visual score
			if (this.vscore < this.score) this.vscore += 1;
		}
	}

	reset() {
		this.score = 0;
		this.vscore = 0;
		this.grid.reset();
	}
}

module.exports = new Game();
