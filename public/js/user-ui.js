const socket = io();
const o = false;
function get(id) {
	return document.getElementById(id);
}
//-------------------------------------------------------------------------
// game variables (initialized during reset)
//-------------------------------------------------------------------------

const tetris = {
	/*
  init: function(){
    this.dx, this.dy,        // pixel size of a single tetris block
    this.blocks,        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
    this.actions,       // queue of user actions (inputs)
    this.playing,       // true|false - game is in progress
    this.dt,            // time since starting this game
    this.current,       // the current piece
    this.next,          // the next piece
    this.score,         // the current score
    this.vscore,        // the currently displayed score (it catches up to score in small chunks - like a spinning slot machine)
    this.rows,          // number of completed rows in the current game
    this.step;          // how long before current piece drops by 1 row

    this.ucanvas = get('upcoming'),
    this.uctx    = ucanvas.getContext('2d'),
    this.speed   = { start: 0.6, decrement: 0.005, min: 0.1 }, // how long before piece drops by 1 row (seconds)
    this.nx      = 10, // width of tetris court (in blocks)
    this.ny      = 20, // height of tetris court (in blocks)
    this.nu      = 5;  // width/height of upcoming preview (in blocks)
      //console.log(ucanvas, uctx)
    this.invalid = {};
  },
  invalidate:       function()  { this.invalid.court  = true; },
  invalidateNext:   function () { this.invalid.next   = true; },
  invalidateScore:  function () { this.invalid.score  = true; },
  invalidateRows:   function () { this.invalid.rows   = true; },

  resize: function(event){
    //canvas.width   = canvas.clientWidth;  // set canvas logical size equal to its physical size
    //canvas.height  = canvas.clientHeight; // (ditto)
    this.ucanvas.width  = this.ucanvas.clientWidth;
    this.ucanvas.height = this.ucanvas.clientHeight;

    this.dx = 200  / this.nx; // pixel size of a single tetris block
    this.dy = 400 / this.ny; // (ditto)

    this.invalidate();
    this.invalidateNext();
  }
*/
};
const pieceObj = {
	/*
    init: function(){

    },
    eachblock: function (type, x, y, dir, fn) {
      var bit, result, row = 0, col = 0, blocks = type.blocks[dir];
      for(bit = 0x8000 ; bit > 0 ; bit = bit >> 1) {
        if (blocks & bit) {
          fn(x + col, y + row);
        }
        if (++col === 4) {
          col = 0;
          ++row;
        }
      }
    },
    dropPiece: function () {
      this.eachblock(current.type, current.x, current.y, current.dir, function(x, y) {
        setBlock(x, y, current.type);
      });
    },
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
    }
    */
};

let isCurrentPlayer = false;

let dx; let dy; // pixel size of a single tetris block
let blocks; // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
let actions; // queue of user actions (inputs)
let playing; // true|false - game is in progress
let dt; // time since starting this game
let pieceToDraw; // a dynamic piece that will be show to user
let current; // the current piece
let next; // the next piece
let score; // the current score
let vscore; // the currently displayed score (it catches up to score in small chunks - like a spinning slot machine)
let rows; // number of completed rows in the current game
let step; // how long before current piece drops by 1 row

const ucanvas = get('upcoming');
const uctx = ucanvas.getContext('2d');
const speed = { start: 0.6, decrement: 0.005, min: 0.1 }; // how long before piece drops by 1 row (seconds)
const nx = 10; // width of tetris court (in blocks)
const ny = 20; // height of tetris court (in blocks)
const nu = 5; // width/height of upcoming preview (in blocks)
// console.log(ucanvas, uctx)
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

function resize(event) {
	// canvas.width   = canvas.clientWidth;  // set canvas logical size equal to its physical size
	// canvas.height  = canvas.clientHeight; // (ditto)
	// ucanvas.width  = ucanvas.clientWidth;
	// ucanvas.height = ucanvas.clientHeight;


	dx = 200 / nx; // pixel size of a single tetris block
	dy = 400 / ny; // (ditto)

	console.log(dx);
	invalidate();
	invalidateNext();
}
resize();
//------------------------------------------------
// do the bit manipulation and iterate through each
// occupied block (x,y) for a given piece
//------------------------------------------------
function drawBlock(ctx, x, y, color) {
	ctx.fillStyle = color;
	ctx.fillRect(x * dx + 1, y * dy + 1, dx - 2, dy - 2);
	ctx.strokeRect(x * dx, y * dy, dx, dy);
}
function eachblock(type, x, y, dir, fn) {
	// console.log(type, x, y, dir)
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
}
function drawPiece(ctx, type, x, y, color, dir) {
	// var color = 'rgba('+type.color.r+','+type.color.g+','+type.color.b+', 0.5)';
	eachblock(type, x, y, dir, (x, y) => {
		drawBlock(ctx, x, y, color);
	});
}
function drawDisplayPiece() {
	if (invalid.next) {
		// console.log(padding)
		uctx.save();
		uctx.translate(0.5, 0.5);
		uctx.clearRect(0, 0, nu * dx, nu * dy);
		// console.log(uctx)
		if (pieceToDraw) var padding = (nu - pieceToDraw.type.size) / 2; // half-arsed attempt at centering next piece display
		if (pieceToDraw) drawPiece(uctx, pieceToDraw.type, padding, padding, pieceToDraw.color, pieceToDraw.dir);
		// uctx.strokeStyle = 'black';
		// uctx.strokeRect(0, 0, nu*dx - 1, nu*dy - 1);
		uctx.restore();
		invalid.next = false;
	}
}
invalidate();
invalidateNext();
invalidateScore();
invalidateRows();

/*
  socket.on('render', function(data){
    //next = data.next;
    current = data.current;

    //console.log(next.type);
    invalid.next = true;
    pieceToDraw = ( isCurrentPlayer )? current : next;
    //pieceToDraw.type.color = data.color;

    drawDisplayPiece();

    //
    $('.keys').toggleClass('paused',!data.playing);
  }); */

socket.on('user-render', (data) => {
	// next = data.next;
	// current = data.current;

	// console.log(next.type);
	invalid.next = true;
	pieceToDraw = data.piece;// ( isCurrentPlayer )? current : next;
	// pieceToDraw.type.color = data.color;
	$('.points').html(data.score);
	drawDisplayPiece();

	//
	$('.keys').toggleClass('paused', data.status !== 3);
});

socket.on('added user', (data) => {
	next = data;
	console.log('added', data);
});

socket.on('start turn', (data) => {
	isCurrentPlayer = true;
	$('.msg').html('Seu turno.');
	$('.keys').toggleClass('off', false);
});

socket.on('next turn', (data) => {
	$('.msg').html('Você é o próximo.');
});

socket.on('end turn', (data) => {
	next = data;
	isCurrentPlayer = false;
	$('.msg').html('');
	$('.keys').toggleClass('off', true);
});

socket.on('connect', (data) => {
	console.log('Conexão estabelecida');
});
socket.on('reconnect', (data) => {
	console.log('Conexão restabelecida');
});
socket.on('connect_error', (data) => {
	console.error('Conexão deu erro');
});
socket.on('reconnect_error', (data) => {
	console.error('Conexão deu erro');
});
