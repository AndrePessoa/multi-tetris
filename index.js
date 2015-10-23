
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

var app_started = false;
requestAnimationFrame = function(callback) {
   setTimeout(callback, 1000 / 30); //60
}

//----------------------
// user manager
//----------------------

var users = {
	pos: 0,
	list: [],
	addUser: function( socket ){
		var has = false
		for (var i = this.list.length - 1; i >= 0; i--) {
			has = has || ( this.list[i].id == socket.id );
		};

		if( !has ){
			this.list.push( socket );
		};
		return socket;
	},
	removeUser: function( socket ){
		if( this.list.indexOf( socket ) > -1 ){
			this.list.splice( this.list.indexOf( socket ), 1 );
		}
		return socket;
	},
	current: function(){
		return this.list[ this.pos ];
	},
	next: function(){
		this.pos = ( this.pos < this.list.length - 1 )? this.pos + 1 : 0;

	},
	getUserOffset: function( user ){

	}
}

//-------------------------------------------------------------------------
// game variables (initialized during reset)
//-------------------------------------------------------------------------



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

io.on('connection', function(socket){
	//console.log( socket );
	socket.join('room');
	
	socket.on('add user', function(color){
		console.log( 'New user: ', color );
		users.addUser( socket );
	});

	socket.on('action', function(command){
		console.log( 'Command: ', command );
		if( socket == users.current() || playing == false ){
			keydown( {keyCode: command} );
		};
	});

	socket.on('disconnect', function () {
		io.emit('user disconnected');
		users.removeUser( socket );
	});

	//-------------------------------------------------------------------------
	// base helper methods
	//-------------------------------------------------------------------------

	function timestamp()           { return new Date().getTime();                             }
	function random(min, max)      { return (min + (Math.random() * (max - min)));            }
	function randomChoice(choices) { return choices[Math.round(random(0, choices.length-1))]; }

	/*if (!window.requestAnimationFrame) { // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
	  window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
	                                 window.mozRequestAnimationFrame    ||
	                                 window.oRequestAnimationFrame      ||
	                                 window.msRequestAnimationFrame     ||
	                                 function(callback, element) {
	                                   window.setTimeout(callback, 1000 / 60);
	                                 }
	}*/


	var i = { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   };
	var j = { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   };
	var l = { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' };
	var o = { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' };
	var s = { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  };
	var t = { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' };
	var z = { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    };

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
	        	setBlock(x, y, current.type);
	    	});
	    },
	    //setBlock: function (x,y,type)     { blocks[x] = blocks[x] || []; blocks[x][y] = type; invalidate(); },

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
		},
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
		  		setBlock(x, y, current.type);
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
		    this.dropPiece();
		    this.removeLines();
		    setCurrentPiece(next);
		    setNextPiece(randomPiece());
		    clearActions();

		    users.current().emit('end turn');
		    users.next();
		    users.current().emit('start turn');
		    console.log( "current user: " + users.current().id );

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

	//-----------------------------------------
	// start with 4 instances of each piece and
	// pick randomly until the 'bag is empty'
	//-----------------------------------------
	var pieces = [];
	function randomPiece() {
	  if (pieces.length == 0)
	    pieces = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z];
	  var type = pieces.splice(random(0, pieces.length-1), 1)[0];
	  return { type: type, dir: DIR.UP, x: Math.round(random(0, nx - type.size)), y: 0 };
	}


	//-------------------------------------------------------------------------
	// GAME LOOP
	//-------------------------------------------------------------------------

	function run() {

	 	addEvents(); // attach keydown and resize events

		var last = now = timestamp();
		function frame() {
			now = timestamp();
			pieceObj.update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab

			socket.to('room').emit('render', {
				now: now,
				dx: dx,
				dy: dy,
				blocks: blocks,
				actions: actions,
				playing: playing,
				dt: dt,
				current: current,
				next: next,
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

	function showStats() {
	  //stats.domElement.id = 'stats';
	  //get('menu').appendChild(stats.domElement);
	}

	function addEvents() {
		socket.on('action', function(keyCode){
			console.log( 'Command: ', keyCode);
			keydown(keyCode);
		});
	  //document.addEventListener('keydown', keydown, false);
	}

	function keydown(ev) {
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
	    play();
	    handled = true;
	  }
	  
	}

	//-------------------------------------------------------------------------
	// GAME LOGIC
	//-------------------------------------------------------------------------

	function play() { console.log('jogo iniciado'); socket.to('room').emit('game start',{}); reset();          playing = true;    }
	function lose() { console.log('jogo finalizado'); socket.to('room').emit('game end',{}); setVisualScore(); playing = false;  }

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
	function setCurrentPiece(piece) { current = piece || randomPiece(); invalidate();     }
	function setNextPiece(piece)    { next    = piece || randomPiece(); invalidateNext(); }

	function reset() {
	  dt = 0;
	  clearActions();
	  clearBlocks();
	  clearRows();
	  clearScore();
	  setCurrentPiece(next);
	  setNextPiece();
	}
	
	var invalid = {};

	function invalidate()         { invalid.court  = true; }
	function invalidateNext()     { invalid.next   = true; }
	function invalidateScore()    { invalid.score  = true; }
	function invalidateRows()     { invalid.rows   = true; }



	//-------------------------------------------------------------------------
	// FINALLY, lets run the game
	//-------------------------------------------------------------------------

	run();
});


http.listen(3000, function(){
	console.log('listening on *:3000');
});