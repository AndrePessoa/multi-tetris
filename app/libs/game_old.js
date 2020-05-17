let dx; let dy; // pixel size of a single tetris block
let blocks; // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
let actions; // queue of user actions (inputs)
let playing; // true|false - game is in progress
let dt; // time since starting this game
let current; // the current piece
let next; // the next piece
let score; // the current score
let vscore; // the currently displayed score (it catches up to score in small chunks - like a spinning slot machine)
let rows; // number of completed rows in the current game
let step; // how long before current piece drops by 1 row

const KEY = {
	ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
};
const DIR = {
	UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3,
};
// stats   = new Stats(),
// canvas  = get('canvas'),
// ctx     = canvas.getContext('2d'),
// ucanvas = get('upcoming'),
// uctx    = ucanvas.getContext('2d'),
const speed = { start: 0.6, decrement: 0.005, min: 0.1 }; // how long before piece drops by 1 row (seconds)
const nx = 30; // width of tetris court (in blocks)
const ny = 20; // height of tetris court (in blocks)
const nu = 5; // width/height of upcoming preview (in blocks)

//------------------------------------------------
// do the bit manipulation and iterate through each
// occupied block (x,y) for a given piece
//------------------------------------------------

const pieceObj = {
	init() {

	},
	eachblock(type, x, y, dir, fn) {
		let bit; let result; let row = 0; let col = 0; const
			blocks = type.blocks[dir];
		for (bit = 0x8000; bit > 0; bit >>= 1) {
			if (blocks & bit) {
				fn(x + col, y + row);
			}
			if (++col === 4) {
				col = 0;
				++row;
			}
		}
	},
	dropPiece() {
		this.eachblock(current.type, current.x, current.y, current.dir, (x, y) => {
			setBlock(x, y, current);
		});
	},
	// setBlock: function (x,y,type)     { blocks[x] = blocks[x] || []; blocks[x][y] = type; invalidate(); },
	/*
	drawPiece: function (ctx, type, x, y, dir) {
		var loc = this;
		this.eachblock(type, x, y, dir, function(x, y) {
			loc.drawBlock(ctx, x, y, type.color);
		});
	},
	drawBlock: function (ctx, x, y, color) {
		ctx.fillStyle = color;
		ctx.fillRect(x*dx, y*dy, dx, dy);
		ctx.strokeRect(x*dx, y*dy, dx, dy)
	}, */
	occupied(type, x, y, dir) {
		let result = false;
		this.eachblock(type, x, y, dir, (x, y) => {
			if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || getBlock(x, y)) result = true;
		});
		return result;
	},
	unoccupied(type, x, y, dir) {
		return !this.occupied(type, x, y, dir);
	},
	move(dir) {
		let { x } = current;
		let { y } = current;
		switch (dir) {
		case DIR.RIGHT: x += 1; break;
		case DIR.LEFT: x -= 1; break;
		case DIR.DOWN: y += 1; break;
		}
		if (this.unoccupied(current.type, x, y, current.dir)) {
			current.x = x;
			current.y = y;
			invalidate();
			return true;
		}
		return false;
	},

	rotate() {
		const newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
		if (this.unoccupied(current.type, current.x, current.y, newdir)) {
			current.dir = newdir;
			invalidate();
		}
	},

	drop() {
		if (!this.move(DIR.DOWN)) {
			addScore(10);
			users.current().addScore(10);
			this.dropPiece();
			this.removeLines();
			clearActions();

			// users.current().piece = Pieces.randomPiece( users.current().color );
			users.current().changePiece();
			users.current().socket.emit('end turn', users.current().piece);
			users.next();
			users.get(1).socket.emit('next turn', users.current().toJson());
			users.current().socket.emit('start turn', users.current().toJson());
			console.log(`current user: ${users.current().socket.id}`);

			setCurrentPiece(users.current().piece);
			setNextPiece(users.get(1).piece);

			if (this.occupied(current.type, current.x, current.y, current.dir)) {
				lose();
			}
		}
	},
	update(idt) {
		if (playing) {
			if (vscore < score) setVisualScore(vscore + 1);

			this.handle(actions.shift());
			dt += idt;
			if (dt > step) {
				dt -= step;
				this.drop();
			}
		}
	},
	handle(action) {
		switch (action) {
		case DIR.LEFT: this.move(DIR.LEFT); break;
		case DIR.RIGHT: this.move(DIR.RIGHT); break;
		case DIR.UP: this.rotate(); break;
		case DIR.DOWN: this.drop(); break;
		}
	},
	removeLine(n) {
		let x; let
			y;
		for (y = n; y >= 0; --y) {
			for (x = 0; x < nx; ++x) setBlock(x, y, (y == 0) ? null : getBlock(x, y - 1));
		}
	},
	removeLines() {
		let x; let y; let complete; let
			n = 0;
		for (y = ny; y > 0; --y) {
			complete = true;
			for (x = 0; x < nx; ++x) {
				if (!getBlock(x, y)) complete = false;
			}
			if (complete) {
				var u;
				for (x = 0; x < nx; ++x) {
					u = users.getById(getBlock(x, y).userId);
					if (u) u.addScore(1);
				}
				this.removeLine(y);
				y += 1; // recheck same line
				n++;
			}
		}
		if (n > 0) {
			addRows(n);
			addScore(100 * Math.pow(2, n - 1)); // 1: 100, 2: 200, 3: 400, 4: 800
		}
	},


};


//-------------------------------------------------------------------------
// GAME LOOP
//-------------------------------------------------------------------------

function run() {
	let last = now = timestamp();
	function frame() {
		now = timestamp();
		pieceObj.update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab

		for (let u = users.list.length - 1; u >= 0; u--) {
			if (users.list[u].status == USERSTATUS.PLAYING) users.list[u].emit('user-render');
		}

		gameSocket.to('room').emit('render', {
			now,
			dx,
			dy,
			blocks,
			actions,
			playing,
			dt,
			current,
			next,
			color: (users.current() || { color: false }).color,
			score,
			vscore,
			rows,
			step,
		});
		// draw();
		// stats.update();
		last = now;
		app_started = true;
		setTimeout(() => {
			frame();
		}, 1000 / framerate);
	}

	// resize(); // setup all our sizing information

	if (!app_started) {
		reset(); // reset the per-game variables
		frame(); // start the first frame
	}
}


function keydown(ev, socket) {
	let handled = false;
	if (playing) {
		switch (ev.keyCode) {
		case KEY.LEFT: actions.push(DIR.LEFT); handled = true; break;
		case KEY.RIGHT: actions.push(DIR.RIGHT); handled = true; break;
		case KEY.UP: actions.push(DIR.UP); handled = true; break;
		case KEY.DOWN: actions.push(DIR.DOWN); handled = true; break;
		case KEY.ESC: lose(); handled = true; break;
		}
	} else if (ev.keyCode == KEY.SPACE) {
		users.pos = users.getPos(socket);
		current = users.current().piece;
		play();
		handled = true;
	}
}

//-------------------------------------------------------------------------
// GAME LOGIC
//-------------------------------------------------------------------------

function play() {
	console.log('jogo iniciado'); users.startGame(); gameSocket.to('room').emit('game start', {}); reset(); playing = true; users.current().socket.emit('start turn', users.current().piece);
}
function lose() {
	console.log('jogo finalizado'); users.stopGame(); gameSocket.to('room').emit('game end', {}); setVisualScore(); playing = false;
}

function setVisualScore(n) {
	vscore = n || score; invalidateScore();
}
function setScore(n) {
	score = n; setVisualScore(n);
}
function addScore(n) {
	score += n;
}
function clearScore() {
	setScore(0);
}
function clearRows() {
	setRows(0);
}
function setRows(n) {
	rows = n; step = Math.max(speed.min, speed.start - (speed.decrement * rows)); invalidateRows();
}
function addRows(n) {
	setRows(rows + n);
}
function getBlock(x, y) {
	return (blocks && blocks[x] ? blocks[x][y] : null);
}
function setBlock(x, y, type) {
	blocks[x] = blocks[x] || []; blocks[x][y] = type; invalidate();
}
function clearBlocks() {
	blocks = []; invalidate();
}
function clearActions() {
	actions = [];
}
function setCurrentPiece(piece) {
	current = piece || Pieces.randomPiece(null, users.current()); invalidate(); return current;
}
function setNextPiece(piece) {
	next = piece || Pieces.randomPiece(null, users.current()); invalidateNext(); return next;
}

function reset() {
	dt = 0;
	clearActions();
	clearBlocks();
	clearRows();
	clearScore();
	setCurrentPiece(users.get(0) ? users.get(0).piece : false);
	setNextPiece(users.get(1) ? users.get(1).piece : false);
}

const invalid = {};

function invalidate() {
	invalid.court = true;
}
function invalidateNext() {
	invalid.next = true;
}
function invalidateScore() {
	invalid.score = true;
}
function invalidateRows() {
	invalid.rows = true;
}


//-------------------------------------------------------------------------
// FINALLY, lets run the game
//-------------------------------------------------------------------------


module.exports = {
	playing: false,
	keydown: (key) => {
		console.log('Command: ', key);
	},
	setSocket: () => {},
	run: () => {},
};
