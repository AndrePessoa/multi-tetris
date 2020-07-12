const socket = io();
/* $('form').submit(function(){
  socket.emit('chat message', $('#m').val());
  $('#m').val('');
  return false;
}); */

let last = now = timestamp();
let color;

socket.on('render', (data) => {
	// console.log( data );

	blocks = data.blocks;
	actions = data.actions;
	playing = data.playing;
	dt = data.dt;
	current = data.current;
	next = data.next;
	score = data.score;
	vscore = data.vscore;
	rows = data.rows;
	step = data.step;
	color = data.color;
	users = data.users;

	if (color) $('body').css('background', `rgba(${255 - color.r},${255 - color.g},${255 - color.b}, 1)`);

	now = timestamp();
	update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab

	invalidate();
	invalidateNext();
	invalidateScore();
	invalidateRows();

	draw();
	stats.update();
	last = now;
});

socket.on('game start', () => {
	play();
	$('body').addClass('playing');
});
socket.on('game end', () => {
	lose();
	$('body').removeClass('playing');
});

//-------------------------------------------------------------------------
// base helper methods
//-------------------------------------------------------------------------

function get(id) {
	return document.getElementById(id);
}
function hide(id) {
	get(id).style.visibility = 'hidden';
}
function show(id) {
	get(id).style.visibility = null;
}
function html(id, html) {
	get(id).innerHTML = html;
}

function timestamp() {
	return new Date().getTime();
}
function random(min, max) {
	return (min + (Math.random() * (max - min)));
}
function randomChoice(choices) {
	return choices[Math.round(random(0, choices.length - 1))];
}

/* if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
                                 window.mozRequestAnimationFrame    ||
                                 window.oRequestAnimationFrame      ||
                                 window.msRequestAnimationFrame     ||
                                 function(callback, element) {
                                   window.setTimeout(callback, 1000 / 60);
                                 }
} */

//-------------------------------------------------------------------------
// game constants
//-------------------------------------------------------------------------

const KEY = {
	ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
};
const DIR = {
	UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3,
};
var stats = new Stats();
const canvas = get('canvas');
const ctx = canvas.getContext('2d');
const ucanvas = get('upcoming');
// uctx    = ucanvas.getContext('2d'),
const speed = { start: 0.6, decrement: 0.005, min: 0.1 }; // how long before piece drops by 1 row (seconds)
const nx = 30; // width of tetris court (in blocks)
const ny = 20; // height of tetris court (in blocks)
const nu = 5; // width/height of upcoming preview (in blocks)

//-------------------------------------------------------------------------
// game variables (initialized during reset)
//-------------------------------------------------------------------------

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
let users; // number of users active
let step; // how long before current piece drops by 1 row

//-------------------------------------------------------------------------
// tetris pieces
//
// blocks: each element represents a rotation of the piece (0, 90, 180, 270)
//         each element is a 16 bit integer where the 16 bits represent
//         a 4x4 set of blocks, e.g. j.blocks[0] = 0x44C0
//
//             0100 = 0x4 << 3 = 0x4000
//             0100 = 0x4 << 2 = 0x0400
//             1100 = 0xC << 1 = 0x00C0
//             0000 = 0x0 << 0 = 0x0000
//                               ------
//                               0x44C0
//
//-------------------------------------------------------------------------

const i = { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan' };
const j = { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue' };
const l = { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' };
const o = { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' };
const s = { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green' };
const t = { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' };
const z = { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red' };

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
			setBlock(x, y, current.type);
		});
	},
	drawPiece(ctx, type, x, y, color, dir) {
		const loc = this;
		this.eachblock(type, x, y, dir, (x, y) => {
			loc.drawBlock(ctx, x, y, color);
		});
	},

	drawBlock(ctx, x, y, color, active) {
		const margin = 8;
		ctx.fillStyle = color;
		ctx.strokeStyle = color;
		ctx.lineWidth = 1;
		ctx.shadowColor = color.replace(', 1 )', ', 0.25 )');
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		ctx.shadowBlur = 5 * margin;
		drawRoundRect( ctx, x * dx + margin/2, y * dy + margin/2, dx - margin, dy - margin, margin/2 ).fill();
		// ctx.fillRect(x * dx + 1.5, y * dy + 1.5, dx - 3, dy - 3);
		// if (active) ctx.fillRect(x * dx + 1.5, y * dy + 1.5, dx - 3, dy - 3);
		// if (!active) ctx.strokeRect(x * dx, y * dy, dx, dy);
	},
};


//-----------------------------------------------------
// check if a piece can fit into a position in the grid
//-----------------------------------------------------
function occupied(type, x, y, dir) {
	let result = false;
	pieceObj.eachblock(type, x, y, dir, (x, y) => {
		if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || getBlock(x, y)) result = true;
	});
	return result;
}

function unoccupied(type, x, y, dir) {
	return !occupied(type, x, y, dir);
}

//-----------------------------------------
// start with 4 instances of each piece and
// pick randomly until the 'bag is empty'
//-----------------------------------------
let pieces = [];
function randomPiece() {
	if (pieces.length == 0) pieces = [i, i, i, i, j, j, j, j, l, l, l, l, o, o, o, o, s, s, s, s, t, t, t, t, z, z, z, z];
	const type = pieces.splice(random(0, pieces.length - 1), 1)[0];
	return {
		type, dir: DIR.UP, x: Math.round(random(0, nx - type.size)), y: 0,
	};
}


//-------------------------------------------------------------------------
// GAME LOOP
//-------------------------------------------------------------------------

function run() {
	showStats(); // initialize FPS counter
	addEvents(); // attach keydown and resize events

	let last = now = timestamp();
	function frame() {
		now = timestamp();
		update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab
		draw();
		stats.update();
		last = now;
		requestAnimationFrame(frame, canvas);
	}

	resize(); // setup all our sizing information
	reset(); // reset the per-game variables
	// frame();  // start the first frame
}

function showStats() {
	stats.domElement.id = 'stats';
	get('tetris').appendChild(stats.domElement);
}

function addEvents() {
	document.addEventListener('keydown', keydown, false);
	window.addEventListener('resize', resize, false);
}

function keydown(ev) {
	if (!Object.values(KEY).includes(ev.keyCode)) return false;

	if (ev !== null) socket.emit('action', ev.keyCode);
	/* var handled = false;
  if (playing) {
    switch(ev.keyCode) {
      case KEY.LEFT:   actions.push(DIR.LEFT);  handled = true; break;
      case KEY.RIGHT:  actions.push(DIR.RIGHT); handled = true; break;
      case KEY.UP:     actions.push(DIR.UP);    handled = true; break;
      case KEY.DOWN:   actions.push(DIR.DOWN);  handled = true; break;
      case KEY.ESC:    lose();                  handled = true; break;
    }
  }
  else if (ev.keyCode == KEY.SPACE) {
    play();
    handled = true;
  }
  if (handled) */
	ev.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
}

function resize(event) {
	canvas.width = canvas.clientWidth; // set canvas logical size equal to its physical size
	canvas.height = canvas.clientHeight; // (ditto)
	// ucanvas.width  = ucanvas.clientWidth;
	// ucanvas.height = ucanvas.clientHeight;
	dx = canvas.width / nx; // pixel size of a single tetris block
	dy = canvas.height / ny; // (ditto)
	invalidate();
	invalidateNext();
}


//-------------------------------------------------------------------------
// GAME LOGIC
//-------------------------------------------------------------------------

function play() {
	// hide('start');
	reset();
	playing = true;
	console.log('inicio');
}
function lose() {
	show('start');
	setVisualScore();
	playing = false;
	console.log('fim');
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
	current = piece || randomPiece(); invalidate();
}
function setNextPiece(piece) {
	next = piece || randomPiece(); invalidateNext();
}

function reset() {
	dt = 0;
	clearActions();
	clearBlocks();
	clearRows();
	clearScore();
	setCurrentPiece(next);
	setNextPiece();
}

function update(idt) {
	if (playing) {
		if (vscore < score) setVisualScore(vscore + 1);
		/* handle(actions.shift());
    dt = dt + idt;
    if (dt > step) {
      dt = dt - step;
      drop();
    } */
	}
}

function handle(action) {
	switch (action) {
	case DIR.LEFT: move(DIR.LEFT); break;
	case DIR.RIGHT: move(DIR.RIGHT); break;
	case DIR.UP: rotate(); break;
	case DIR.DOWN: drop(); break;
	}
}

/* function move(dir) {
  var x = current.x, y = current.y;
  switch(dir) {
    case DIR.RIGHT: x = x + 1; break;
    case DIR.LEFT:  x = x - 1; break;
    case DIR.DOWN:  y = y + 1; break;
  }
  if (unoccupied(current.type, x, y, current.dir)) {
    current.x = x;
    current.y = y;
    invalidate();
    return true;
  }
  else {
    return false;
  }
}

function rotate() {
  var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
  if (unoccupied(current.type, current.x, current.y, newdir)) {
    current.dir = newdir;
    invalidate();
  }
}

function drop() {
  if (!move(DIR.DOWN)) {
    addScore(10);
    dropPiece();
    removeLines();
    setCurrentPiece(next);
    setNextPiece(randomPiece());
    clearActions();
    if (occupied(current.type, current.x, current.y, current.dir)) {
      lose();
    }
  }
} */


function removeLines() {
	let x; let y; let complete; let
		n = 0;
	for (y = ny; y > 0; --y) {
		complete = true;
		for (x = 0; x < nx; ++x) {
			if (!getBlock(x, y)) complete = false;
		}
		if (complete) {
			removeLine(y);
			y += 1; // recheck same line
			n++;
		}
	}
	if (n > 0) {
		addRows(n);
		addScore(100 * Math.pow(2, n - 1)); // 1: 100, 2: 200, 3: 400, 4: 800
	}
}

function removeLine(n) {
	let x; let
		y;
	for (y = n; y >= 0; --y) {
		for (x = 0; x < nx; ++x) setBlock(x, y, (y == 0) ? null : getBlock(x, y - 1));
	}
}

//-------------------------------------------------------------------------
// RENDERING
//-------------------------------------------------------------------------

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

function draw() {
	ctx.save();
	// ctx.lineWidth = 1;
	// ctx.translate(0, 0.5); // for crisp 1px black lines
	drawCourt();
	// drawNext();
	drawScore();
	drawRows();
	drawUsers();
	ctx.restore();
}

function drawRoundRect(ctx, x, y, width, height, radius) {
	// ctx.strokeRect(x, y, width, height);
	if (width < 2 * radius) radius = width / 2;
	if (height < 2 * radius) radius = height / 2;
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + width, y, x + width, y + height, radius);
	ctx.arcTo(x + width, y + height, x, y + height, radius);
	ctx.arcTo(x, y + height, x, y, radius);
	ctx.arcTo(x, y, x + width, y, radius);
	ctx.closePath();
	return ctx;
}

function drawCourt() {
	if (invalid.court) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		let x; let y; let
			block;
		for (y = 0; y < ny; y++) {
			for (x = 0; x < nx; x++) {
				if (block = getBlock(x, y)) pieceObj.drawBlock(ctx, x, y, block.color, block.active);
			}
		}
		// ctx.strokeRect(0, 0, nx*dx - 1, ny*dy - 1); // court boundary
		invalid.court = false;
	}
}

function drawUsers() {
	html('users_count', users.length);
	html('users', users.map((user, i)=>`<li><span>${i+1}º</span> <i style="background: rgb(${user.color.r}, ${user.color.g}, ${user.color.b});" ></i> ${user.score}</li>`).join(''));
	invalid.score = false;
}


function drawScore() {
	if (invalid.score) {
		html('score', (`00000${Math.floor(vscore)}`).slice(-5));
		invalid.score = false;
	}
}

function drawRows() {
	if (invalid.rows) {
		html('rows', rows);
		invalid.rows = false;
	}
}


//-------------------------------------------------------------------------
// FINALLY, lets run the game
//-------------------------------------------------------------------------

run();
socket.emit('add viewer', 'main');
