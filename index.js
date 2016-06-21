
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/mobile.html');
});

app.get('/control', function(req, res){
  res.sendFile(__dirname + '/public/mobile.html');
});

var framerate = 30;
var app_started = false;
requestAnimationFrame = function(callback) {
   setTimeout(callback, 1000 / framerate); //60
}

//----------------------
// user manager
//----------------------

var USERSTATUS = {};
USERSTATUS.LOGIN = 1;
USERSTATUS.READY = 2;
USERSTATUS.PLAYING = 3;

var User = function(socket, color){
	this.status = USERSTATUS.LOGIN;
	this.id = socket.id;
	this.socket = socket;
	this.color = color;
	this.piece = null;
	this.score = 0;

	this.changePiece();
};
User.prototype.changePiece = function(){
	this.piece = PIECES.randomPiece( this.color );
	this.piece.userId = this.id;
};
User.prototype.setStatus = function( status ){
	this.status = status;
};
User.prototype.addScore = function( points ){
	this.score += points;
};
User.prototype.toJson = function(){
	var json = {};
	json.id = this.id;
	json.status = this.status;
	json.color = this.color;
	json.piece = this.piece;
	json.score = this.score;

	return json;
};
User.prototype.emit = function(ev, data){
	this.socket.emit( ev, data || this.toJson() );
}

var users = {
	pos: 0,
	list: [],
	addUser: function( user ){
		var has = false
		for (var i = this.list.length - 1; i >= 0; i--) {
			has = has || ( this.list[i].id == user.socket.id );
		};

		if( !has ){
			user.socket.emit('added user', user.piece);
			this.list.push( user );
		};
		return user;
	},
	removeUser: function( socket ){
		var index = this.getPos( socket );
		if( index > -1 ){
			delete this.list[index];
			this.list.splice( index, 1 );
			if( index < this.pos ){ this.pos--; }
		};
		return socket;
	},
	current: function(){
		return this.list[ this.pos ];
	},
	getPos: function( socket ){
		var index = -1;
		for (var i = this.list.length - 1; i >= 0; i--) {
			if( this.list[i].socket == socket ){ index = i; break; }
		};
		return index;
	},
	getById: function( id ){
		for (var i = this.list.length - 1; i >= 0; i--) {
			if( this.list[i].id === id ) return this.list[i]
		}
		return false;
	},
	get: function( offset ){
		var pos = this.pos + offset;
		pos = ( pos < this.list.length - 1 && pos > 0 )? pos : 0;
		return this.list[ pos ];
	},
	next: function(){
		this.pos = ( this.pos < this.list.length - 1 )? this.pos + 1 : 0;
	},
	getUserOffset: function( user ){

	},
	startGame: function(){
		for (var i = this.list.length - 1; i >= 0; i--) {
			this.list[i].setStatus( USERSTATUS.PLAYING );
		}
	},
	stopGame: function(){
		for (var i = this.list.length - 1; i >= 0; i--) {
			this.list[i].setStatus( USERSTATUS.READY );
		}
	}
}


//--------------------------
// Pieces 
// -------------------

//-----------------------------------------
// start with 4 instances of each piece and
// pick randomly until the 'bag is empty'
//-----------------------------------------

var Piece = function( ntype ){
	this.type 	= ntype;
	this.dir  	= null;
	this.color  = null;
	this.x 		= 0;
	this.y 		= 0;
	this.userId = false;
};

var PIECES = {
	pieces: [],
	piecesMaxCollection: 4,
	types: [
		/*i*/ { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   },
		/*j*/ { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   },
		/*l*/ { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' },
		/*o*/ { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' },
		/*s*/ { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  },
		/*t*/ { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' },
		/*z*/ { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    }
	],
	rgbToColor: function( color ){
		return 'rgba('+color.r+','+color.g+','+color.b+', 1)';
	},
	randomPiece: function( color ){
		if (this.pieces.length == 0){
			this.pieces = [];
			for (var i = this.types.length - 1; i >= 0; i--) {
				for (var j = this.piecesMaxCollection; j >= 0; j--) { this.pieces.push( this.types[i] ); }
			}
		}

		var type = this.pieces.splice(random(0, this.pieces.length-1), 1)[0];
		var ntype = {};
		for (prop in type) {
		  if (type.hasOwnProperty(prop)) {
			ntype[prop] = type[prop];
		  }
		}

		var piece = new Piece( ntype );
		piece.color = this.rgbToColor( color || ( users.current()?users.current().color:'white' ) );
		piece.x		= Math.round(random(0, nx - ntype.size));
		piece.dir 	= DIR.UP;

		return piece;
	}
}
/*
var pieces = [];
function randomPiece( color ) {
  if (pieces.length == 0)
    pieces = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z];
  var type = pieces.splice(random(0, pieces.length-1), 1)[0];
  var ntype = {};
  for (prop in type) {
      if (type.hasOwnProperty(prop)) {
    	ntype[prop] = type[prop];
      }
  }

  var color = color || ( users.current()?users.current().color:'white' );
  var column = Math.round(random(0, nx - ntype.size));
  ntype.color = 'rgba('+color.r+','+color.g+','+color.b+', 1)'

  return { type: ntype, dir: DIR.UP, x: Math.round(random(0, nx - ntype.size)), y: 0 };
}*/

//-------------------------------------------------------------------------
// game variables (initialized during reset)
//-------------------------------------------------------------------------


//-------------------------------------------------------------------------
// base helper methods
//-------------------------------------------------------------------------

function timestamp()           { return new Date().getTime();                             }
function random(min, max)      { return (min + (Math.random() * (max - min)));            }
function randomChoice(choices) { return choices[Math.round(random(0, choices.length-1))]; }

var dx, dy,        // pixel size of a single tetris block
    blocks,        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
    actions,       // queue of user actions (inputs)
    playing,       // true|false - game is in progress
    dt,            // time since starting this game
    current,       // the current piece
    next,          // the next piece
    score,         // the current score
    vscore,        // the currently displayed score (it catches up to score in small chunks - like a spinning slot machine)
    rows,          // number of completed rows in the current game
    step;          // how long before current piece drops by 1 row

var KEY     = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 },
    DIR     = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 },
    //stats   = new Stats(),
    //canvas  = get('canvas'),
    //ctx     = canvas.getContext('2d'),
    //ucanvas = get('upcoming'),
    //uctx    = ucanvas.getContext('2d'),
    speed   = { start: 0.6, decrement: 0.005, min: 0.1 }, // how long before piece drops by 1 row (seconds)
    nx      = 30, // width of tetris court (in blocks)
    ny      = 20, // height of tetris court (in blocks)
    nu      = 5;  // width/height of upcoming preview (in blocks)

var gameSocket = null;

io.on('connection', function(socket){
	console.log( "Nova conexão aberta", socket.id );	

	socket.on('add viewer', function(){
		socket.join('room');
	});
	
	socket.on('add user', function(color){
		socket.join('room');
		console.log( 'New user: ', color );
		var newUser = new User( socket ,color);
		users.addUser( newUser );
		newUser.setStatus( playing ? USERSTATUS.PLAYING : USERSTATUS.READY );
		console.log(newUser);
	});

	socket.on('action', function(command){
		console.log( 'Command: ', command );
		var u = users.current();
		if( ( u &&  socket.id == u.socket.id ) || !playing ){
			keydown( {keyCode: command}, socket );
		};
	});

	socket.on('disconnect', function () {
		io.emit('user disconnected');
		users.removeUser( socket );
	});

	if( !gameSocket ){
		gameSocket = socket;
		run();
	}
});


	/*if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	  window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
	                                 window.mozRequestAnimationFrame    ||
	                                 window.oRequestAnimationFrame      ||
	                                 window.msRequestAnimationFrame     ||
	                                 function(callback, element) {
	                                   window.setTimeout(callback, 1000 / 60);
	                                 }
	}*/


	//------------------------------------------------
	// do the bit manipulation and iterate through each
	// occupied block (x,y) for a given piece
	//------------------------------------------------

	var pieceObj = {
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
	        	setBlock(x, y, current);
	    	});
	    },
	    //setBlock: function (x,y,type)     { blocks[x] = blocks[x] || []; blocks[x][y] = type; invalidate(); },
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
		},*/
		occupied: function (type, x, y, dir) {
			var result = false;
			this.eachblock(type, x, y, dir, function(x, y) {
			if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || getBlock(x,y))
			  result = true;
			});
			return result;
		},
		unoccupied: function (type, x, y, dir) {
		  return !this.occupied(type, x, y, dir);
		},
		dropPiece: function () {
			this.eachblock(current.type, current.x, current.y, current.dir, function(x, y) {
		  		setBlock(x, y, current);
		  	});
		},
		move: function (dir) {
		  var x = current.x, y = current.y;
		  switch(dir) {
		    case DIR.RIGHT: x = x + 1; break;
		    case DIR.LEFT:  x = x - 1; break;
		    case DIR.DOWN:  y = y + 1; break;
		  }
		  if (this.unoccupied(current.type, x, y, current.dir)) {
		    current.x = x;
		    current.y = y;
		    invalidate();
		    return true;
		  }
		  else {
		    return false;
		  }
		},

		rotate: function () {
		  var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
		  if (this.unoccupied(current.type, current.x, current.y, newdir)) {
		    current.dir = newdir;
		    invalidate();
		  }
		},

		drop: function () {
		  if (!this.move(DIR.DOWN)) {
		    addScore(10);
		    users.current().addScore(10);
		    this.dropPiece();
		    this.removeLines();
		    clearActions();

		    //users.current().piece = PIECES.randomPiece( users.current().color );
		    users.current().changePiece();
		    users.current().socket.emit('end turn', users.current().piece );
		    users.next();
		    users.get(1).socket.emit('next turn',  users.current().toJson());
		    users.current().socket.emit('start turn',  users.current().toJson());
		    console.log( "current user: " + users.current().socket.id );

		    setCurrentPiece( users.current().piece );
		    setNextPiece( users.get( 1 ).piece );

		    if (this.occupied(current.type, current.x, current.y, current.dir)) {
		      lose();
		    }
		  }
		},
		update: function (idt) {
		  if (playing) {
		    if (vscore < score)
		    	setVisualScore(vscore + 1);
		    this.handle(actions.shift());
		    dt = dt + idt;
		    if (dt > step) {
		      dt = dt - step;
		      this.drop();
		    }
		  }
		},
		handle: function (action) {
		  switch(action) {
		    case DIR.LEFT:  this.move(DIR.LEFT);  break;
		    case DIR.RIGHT: this.move(DIR.RIGHT); break;
		    case DIR.UP:    this.rotate();        break;
		    case DIR.DOWN:  this.drop();          break;
		  }
		},
		removeLine: function (n) {
		  var x, y;
		  for(y = n ; y >= 0 ; --y) {
		    for(x = 0 ; x < nx ; ++x)
		      setBlock(x, y, (y == 0) ? null : getBlock(x, y-1));
		  }
		},
		removeLines: function () {
		  var x, y, complete, n = 0;
		  for(y = ny ; y > 0 ; --y) {
		    complete = true;
		    for(x = 0 ; x < nx ; ++x) {
		      if (!getBlock(x, y))
		        complete = false;
		    }
		    if (complete) {
		    	var u;
		    	for(x = 0 ; x < nx ; ++x) {
		    		u = users.getById( getBlock(x, y).userId );
		    		if( u ) u.addScore(1);
		    	}
		      this.removeLine(y);
		      y = y + 1; // recheck same line
		      n++;
		    }
		  }
		  if (n > 0) {
		    addRows(n);
		    addScore(100*Math.pow(2,n-1)); // 1: 100, 2: 200, 3: 400, 4: 800
		  }
		}


    }


	//-------------------------------------------------------------------------
	// GAME LOOP
	//-------------------------------------------------------------------------

	function run() {

		var last = now = timestamp();
		function frame() {
			now = timestamp();
			pieceObj.update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab

			for( var u = users.list.length - 1; u >= 0; u-- ){
				if( users.list[u].status == USERSTATUS.PLAYING )  users.list[u].emit('user-render');
			}

			gameSocket.to('room').emit('render', {
				now: now,
				dx: dx,
				dy: dy,
				blocks: blocks,
				actions: actions,
				playing: playing,
				dt: dt,
				current: current,
				next: next,
				color: ( users.current() || { color:false } ).color,
				score: score,
				vscore: vscore,
				rows: rows,
				step: step
			});
			//draw();
			//stats.update();
			last = now;
			app_started = true;
			requestAnimationFrame(frame);

		}

		//resize(); // setup all our sizing information
		
	 	if( !app_started ){
	 		reset();  // reset the per-game variables
	  		frame();  // start the first frame
		}

	}


	function keydown( ev, socket ) {
	  var handled = false;
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
	  	users.pos = users.getPos( socket );
	  	current = users.current().piece;
	    play();
	    handled = true;
	  }
	  
	}

	//-------------------------------------------------------------------------
	// GAME LOGIC
	//-------------------------------------------------------------------------

	function play() { console.log('jogo iniciado'); users.startGame(); gameSocket.to('room').emit('game start',{}); reset();         playing = true; users.current().socket.emit('start turn',  users.current().piece);   }
	function lose() { console.log('jogo finalizado'); users.stopGame(); gameSocket.to('room').emit('game end',{}); setVisualScore(); playing = false;  }

	function setVisualScore(n)      { vscore = n || score; invalidateScore(); }
	function setScore(n)            { score = n; setVisualScore(n);  }
	function addScore(n)            { score = score + n;   }
	function clearScore()           { setScore(0); }
	function clearRows()            { setRows(0); }
	function setRows(n)             { rows = n; step = Math.max(speed.min, speed.start - (speed.decrement*rows)); invalidateRows(); }
	function addRows(n)             { setRows(rows + n); }
	function getBlock(x,y)          { return (blocks && blocks[x] ? blocks[x][y] : null); }
	function setBlock(x,y,type)     { blocks[x] = blocks[x] || []; blocks[x][y] = type; invalidate(); }
	function clearBlocks()          { blocks = []; invalidate(); }
	function clearActions()         { actions = []; }
	function setCurrentPiece(piece) { current = piece || PIECES.randomPiece(); invalidate(); return current; }
	function setNextPiece(piece)    { next    = piece || PIECES.randomPiece(); invalidateNext(); return next; }

	function reset() {
	  dt = 0;
	  clearActions();
	  clearBlocks();
	  clearRows();
	  clearScore();
	  setCurrentPiece( users.get( 0 )?users.get( 0 ).piece : false );
	  setNextPiece( users.get( 1 )?users.get( 1 ).piece : false );
	}
	
	var invalid = {};

	function invalidate()         { invalid.court  = true; }
	function invalidateNext()     { invalid.next   = true; }
	function invalidateScore()    { invalid.score  = true; }
	function invalidateRows()     { invalid.rows   = true; }



	//-------------------------------------------------------------------------
	// FINALLY, lets run the game
	//-------------------------------------------------------------------------

	


http.listen(3000, function(){
	console.log('listening on *:3000');
});