const logger = require('../libs/logger');
const { timestamp, random } = require('../libs/utils');

const { User } = require('../models/user');
const Grid = require('./grid');
const Block = require('../models/block');
const { users, USERSTATUS } = require('../models/users');
const pieces = require('../models/pieces');
const configs = require('../config/grid_config');

const IMPACT_TYPES = require('../libs/impactTypes');

const KEYS = require('../libs/keys');

const COLUMNS = 6;

class Game {
	constructor() {
		this._loop = null;
		this._columns = [];
		this.playing = false;
		this.socket = null;
		this.score = 0;
		this.vscore = 0;
		this.removedRows = 1;
		this.grid = (new Grid(configs.height, configs.width));
	}

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
			logger.log('Dashboard command', command);
			switch (command) {
			case KEYS.ESC: this.gameover(); break;
			case KEYS.SPACE: this.start(); break;
			default: break;
			}
		}
	}

	start() {
		logger.log('Starting. Already playing', this.playing);
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
			logger.log('Gaming socket setted', socket.id);
			this.run();
		} else {
			logger.log('Removing game socket');
		}
		this.socket = socket;
	}

	getColumn() {
		if (!this._columns.length) {
			for (let index = 0; index < COLUMNS; index++) {
				this._columns.push(index);
			}
		}
		return this._columns.splice(random(0, this._columns.length - 1), 1)[0];
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
					blocks.push(new Block({ x, y, color: 'rgba( 255, 255, 255, 1 )' }));
				}
			}
			rate -= decreaseRate;
		}
		this.grid.freezeBlocks(blocks);
	}

	framePlaying(/* last */) {
		const now = timestamp();

		const completedLines = this.grid.removeLines();
		this.removedRows += completedLines.rows;
		this.score += completedLines.removedBlocks.length;
		const grid = this.grid.snapshot();
		users.current().forEach((user) => {
			// manager user piece
			// if user dont have a piece, create it
			if (!user.piece) {
				const newPiece = pieces.randomPiece(user.color);
				const colWidth = Math.floor((this.grid.width) / COLUMNS);
				const colIndex = this.getColumn() + 0.33;
				const newX = Math.floor((colWidth) * colIndex);
				user.setPiece(newPiece);
				user.piece.x = newX;
				user.piece.y = -2;
			}

			user.piece.unoccupied = (blocks) => !grid.occupied(blocks);
			user.processCommand();
			const impact = !user.piece.drop(); // automatic drop piece
			// if have impact fix the piece
			if (impact) {
				const blocks = user.piece.getBlocks();
				const isLast = blocks.findIndex((block) => block.y < 1) > -1;

				if (isLast) this.gameover();
				this.grid.freezeBlocks(blocks);
				grid.addBlocks(user.piece.getBlocks());
				user.setPiece(null);
			} else {
				// create ghost
				const ghost = user.piece.clone();
				ghost.unoccupied = ((blocks) => {
					const imp = grid.occupied(blocks);
					logger.log('impact', imp);
					return imp !== IMPACT_TYPES.IMPACT;
				});

				while(ghost.drop()) {}; // loop drop until impact on floor

				const blocks = ghost.getBlocks();
				blocks.forEach((block) => {
					block.ghost = 'true';
				});
				grid.addBlocks(blocks);
				grid.addBlocks(user.piece.getBlocks());
			}
			// manager user points
			user.addScore(completedLines.removedBlocks.filter((b) => b.user_id === user.id).length);

			user.emit('user-render');
		});

		if (this.playing) {
			logger.log('playing');
		}

		return {
			now,
			grid,
		};
	}

	run() {
		if (this.playing) return false;
		let last = timestamp();
		const now = last;
		logger.log('Runming', last);

		const frame = () => {
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
			const { score, vscore, playing } = this;
			const scoreList = users
				.current()
				.sort((userA, userB) => (userA.score - userB.score))
				.map((user) => user.toJson());

			const renderObj = {
				now,
				score,
				vscore,
				playing,
				blocks: grid.bitmap,
				rows: this.removedRows,
				users: users.list.map((user) => user.toJson()),
				scoreList,
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
		users.list.forEach((user) => user.reset());
		this.score = 0;
		this.vscore = 0;
		this.grid.reset();
	}
}

module.exports = new Game();
