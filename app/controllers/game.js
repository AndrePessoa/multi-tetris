const timestamp = require('../libs/utils').timestamp;
const { User } = require('../models/user');
const { Grid } = require('../controllers/grid');
const Block = require('../models/block');
const { users, USERSTATUS } = require('../models/users');
const pieces = require('../models/pieces');
const configs = require('../config');

const Game = {
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
		if(user) user.setCommand(command);
	},
	setSocket: function(socket){
		if(socket){
			console.log('Gaming socket setted', socket.id);
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
	run: function(){
		if( this.playing ) return false;
		let last = now = timestamp();
		let grid;
		this.createBaseBlocks();
		const frame = () => {
			const now = timestamp();
			pieces.update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab

			const completedLines = this.grid.removeLines();
			this.removedRows += completedLines.rows;
			this.score += completedLines.removedBlocks.length;
			grid = this.grid.snapshot();
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
					this.grid.freezeBlocks(user.piece.getBlocks());
					grid.addBlocks(user.piece.getBlocks());
					user.setPiece(null);
				}else {
					grid.addBlocks(user.piece.getBlocks());
				}
				// manager user points
				user.addScore( completedLines.removedBlocks.filter((b) => b.user_id === user.id).length );

				user.emit('user-render');
			});

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

			last = now;
			this.playing = true;
			this.update();

			setTimeout(() => {
				frame();
			}, 1000 / configs.framerate);
		}
		
		
		// reset();  // reset the per-game variables
		frame();  // start the first frame
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