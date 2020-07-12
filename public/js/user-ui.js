const USERSTATUS = {
  OFFLINE: 0,
	LOGIN: 1,
	READY: 2,
	PLAYING: 3,
};

const stage = {
  width: 7,
  height: 7,
  canvas: function() {
    return $('#upcoming')[0];
  },
  getBlockPixels: function(canvas) {
    return {
      dx: canvas.width / this.width,
      dy: canvas.height / this.height,
    };
  }
};

const user = {
  status: USERSTATUS.OFFLINE,
  piece: null,
  points: 0,
  color: null,
  canvas: null,
  render: function(){
    switch(this.status){
      case USERSTATUS.ACTIVE:
      break;
        $('.msg').html('Seu turno.');
      break;
      case USERSTATUS.NEXT:
        $('.msg').html('Você é o próximo.');
      break;
      default:
        $('.msg').html('');
    }

    $('.keys').toggleClass('off', this.status !== USERSTATUS.PLAYING);
    $('.keys').toggleClass('paused', this.status !== 3);
    $('.points').html(this.points);
    if(this.piece){
      const ctx = this.canvas.getContext('2d');
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.piece.drawPiece();
    }
  },
  init: function(){
    // START
    $(() => {
      this.canvas = stage.canvas();
      this.piece = new Piece(this.canvas, stage.width, stage.height);
      const socket = io();
      this.initConnection(socket);
      this.addEvents(socket);
    });
  },
  initConnection: function(socket) {
    socket.on('user-render', (data) => {
      this.status = data.status;
      this.piece.update({...data.piece, x: 2, y: 2, color: 'rgba( 255, 255, 255, 1)'});
      this.points = data.score;
      this.render();
    });
    
    socket.on('added user', (data) => {
      //next = data;
      console.log('added', data);
    });
    
    socket.on('start turn', (data) => {
      this.status = USERSTATUS.ACTIVE;
      this.render();
    });
    
    socket.on('next turn', (data) => {
      this.render();
    });
    
    socket.on('end turn', (data) => {
      //next = data;
      this.status = USERSTATUS.READY;
      this.render();
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

    this.color = hslToRgb(
      (Math.random()),
      (Math.random() * 0.25 + 0.5),
      (Math.random() * 0.25 + 0.25),
    );

    $(() => {
      $('.keys div.space, .keys .row > div').click(function () {
        if (!$('.keys').hasClass('off') && !$('.keys').hasClass('paused')) {
          $('canvas').removeClass('moveDown moveLeft moveRight rotate');
          switch ($(this).data('code')) {
          case KEY.LEFT: setTimeout(() => {
            $('canvas').addClass('moveLeft');
          }, 5); break;
          case KEY.RIGHT: setTimeout(() => {
            $('canvas').addClass('moveRight');
          }, 5); break;
          case KEY.DOWN: setTimeout(() => {
            $('canvas').addClass('moveDown');
          }, 5); break;
          case KEY.UP: setTimeout(() => {
            $('canvas').addClass('rotate');
          }, 5); break;
          }
        }
        socket.emit('action', $(this).data('code'));
      });
    
      $('#new_color').click(() => {
        this.color = hslToRgb(
          (Math.random()),
          (Math.random() * 0.25 + 0.5),
          (Math.random() * 0.25 + 0.25),
        );
        $('body').attr('style', `--user-color: rgba(${this.color.r},${this.color.g},${this.color.b}, 1)`);
      });
      $('#add').click(() => {
        $('.keys').removeClass('hide');
        $('#new_user').addClass('hide');
        socket.emit('add user', this.color);
      });

      $('body').attr('style', `--user-color: rgba(${this.color.r},${this.color.g},${this.color.b}, 1)`);
    });
  }
};

user.init();
