const USERSTATUS = {
  OFFLINE: 0,
	LOGIN: 1,
	READY: 2,
	PLAYING: 3,
};

const stage = {
  width: 30,
  height: 20,
  canvas: function() {
    return $('#canvas')[0];
  },
  getBlockPixels: function(canvas) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    return {
      dx: canvas.width / this.width,
      dy: canvas.height / this.height,
    };
  }
};

const screen = {
  blocks: [],
  users: [],
  status: USERSTATUS.OFFLINE,
  init: function(){
    const socket = io();
    this.initConnection(socket);
    this.addEvents(socket);
    socket.emit('add viewer', 'main');
    this.render();
  },
  render: function(){
    $('body').toggleClass('playing', (this.status === USERSTATUS.PLAYING));

    // Stage
    const canvas = stage.canvas();
    const {dx, dy} = stage.getBlockPixels(canvas);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.blocks.forEach((line) => {
      line.forEach((block) => { if(block) { Block.drawBlock( ctx, block.x, block.y, dx, dy, block.color, block.ghost );} });
    });
    // Scores
    $('#users').html(this.users.map((user, i)=>`<li><span>${i+1}º</span> <i style="background: rgb(${user.color.r}, ${user.color.g}, ${user.color.b});" ></i> ${user.score}</li>`));
  },
  initConnection: function(socket){
    socket.on('render', (data) => {
      // console.log( data );

      this.blocks = data.blocks;
      this.status = data.playing ? USERSTATUS.PLAYING : USERSTATUS.OFFLINE ;
      /* actions = data.actions;
      playing = data.playing;
      dt = data.dt;
      current = data.current;
      next = data.next;
      score = data.score;
      vscore = data.vscore;
      rows = data.rows;
      step = data.step;
      color = data.color; */
      this.users = data.users;

      /* now = timestamp();
      // update(Math.min(1, (now - last) / 1000.0)); // using requestAnimationFrame have to be able to handle large delta's caused when it 'hibernates' in a background or non-visible tab

      draw();
      stats.update();
      last = now;
      this.render(); */
      this.render();
    });

    socket.on('game start', () => {
      console.log('inicio');
      this.status = USERSTATUS.PLAYING;
      this.render();
    });
    socket.on('game end', () => {
      console.log('fim');
      $('body').removeClass('playing');
      this.status = USERSTATUS.READY;
      this.render();
    });
  },
  addEvents: function(socket){
    const KEY = {
      ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40,
    };
	  document.addEventListener('keydown', (ev) => {
      if (!Object.values(KEY).includes(ev.keyCode)) return false;
      if (ev !== null) socket.emit('action', ev.keyCode);
      ev.preventDefault();
    }, false);

	  window.addEventListener('resize', (evt) => {
      console.log(evt);
    }, false);
  }
};

screen.init();