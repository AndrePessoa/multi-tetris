const timestamp = require('../libs/utils').timestamp;
const { User } = require('../models/user');
const { Grid } = require('../controllers/grid');
const Block = require('../models/block');
const { users, USERSTATUS } = require('../models/users');
const pieces = require('../models/pieces');
const configs = require('../config');

const Game = {
	_loop: null,
	playing: false,
	socket: null,
	//
	score: 0,
	vscore: 0,
	removedRows: 1,
	grid: (new Grid(configs.height,configs.width)),
	//
	newUser: function(socket, color){
		var newUser = new User( socket, color );
		users.addUser( newUser );
		newUser.socket.join('room');
		newUser.setStatus( this.playing ? USERSTATUS.PLAYING : USERSTATUS.READY );
	},
	removeUser: function(socket){
		users.removeUser(socket);
		this.emit('user disconnected');
	},
	onUserCommand: function(socket, command){
		const user = users.getById(socket.id);
		if(user){
			user.setCommand(command);
		} else {
			switch(command){
				case 27: this.gameover(); break;
				case 32: this.start(); break;
			}
		}
	},
	start: function(){
		if(!this.playing){
			this.reset();
			this.grid.reset();
			this.createBaseBlocks();
			this.playing = true;
		}
	},
	gameover: function(){
		this.playing = false;
	},
	setSocket: function(socket){
		if(this._loop) clearTimeout(this._loop);
		if(socket){
			console.log('Gaming socket setted', socket.id);
			this.run();
		}else{
			console.log('Removing game socket');
		}
		this.socket = socket;
	},
	createBaseBlocks: function(){
		/*this.grid.freezeBlocks([
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
		]);*/
		const blocks = [];
		let rate = .9;
		let decreaseRate = .2;
		const height = 3;
		for(let y = this.grid.height ; y >= this.grid.height - height ; --y) {
			for(let x = 0 ; x < this.grid.width ; ++x) {
				if( Math.random() < rate ){
					blocks.push(new Block({x, y, color: 'grey'}));
				}
			}
			rate -= decreaseRate;
		}
		this.grid.freezeBlocks(blocks);
	},
	framePlaying: function(last){
		const now = timestamp();
		pieces.update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab

		const completedLines = this.grid.removeLines();
		this.removedRows += completedLines.rows;
		this.score += completedLines.removedBlocks.length;
		let grid = this.grid.snapshot();
		users.current().map((user) => {
			// manager user piece
			if(!user.piece){
				const newPiece = pieces.randomPiece(user.color);
				user.setPiece(newPiece);
				user.piece.x = Math.round( Math.random() * (this.grid.width - 4) );
				user.piece.y = -2;
			}
			user.piece.unoccupied = (blocks) => { return !grid.occupied(blocks) };
			user.processCommand();
			if( !user.piece.drop() ){
				const blocks = user.piece.getBlocks();
				const isLast = blocks.findIndex(block => block.y < 1) > -1;
				
				if(isLast) this.gameover();

				this.grid.freezeBlocks(blocks);
				grid.addBlocks(user.piece.getBlocks());
				user.setPiece(null);
			}else {
				grid.addBlocks(user.piece.getBlocks());
			}
			// manager user points
			user.addScore( completedLines.removedBlocks.filter((b) => b.user_id === user.id).length );

			user.emit('user-render');
		});

		return {
			now,
			grid
		};
	},
	run: function(){
		if( this.playing ) return false;
		let last = now = timestamp();
		console.log('run', last);
		const frame = () => {
			console.log('playing', this.playing);
			if(this.playing){
				const {
					now,
					grid
				} = this.framePlaying(last);
				last = now;
				this.render(now, grid);
			}else{
				this.render(now, this.grid.blocks);
			}
			this._loop = setTimeout(() => {
				this.update();
				frame();
			}, 1000 / configs.framerate);
		}

		// reset();  // reset the per-game variables
		frame();  // start the first frame
	},
	render: function(now, grid){
		if(this.socket) {
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
				color: function( users.current() || { color:false } ).color,
				step: step
				*/
			};
			this.socket.emit('ping');
			this.socket.emit('render', renderObj);
		}
	},
	emit: function(event, args) {
		if(this.socket) this.socket.emit(event, args);
	},
	update: function (idt) {
		if (this.playing) { // update visual score
			if (this.vscore < this.score) this.vscore += 1;
		}
	},
	reset: function() {
		this.score = 0;
		this.vscore = 0;
		this.grid.reset();
	}
}

module.exports = Game;