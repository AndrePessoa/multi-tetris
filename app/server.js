const { io, http, app } = require('./routes');
const game = require('./controllers/game');

io.on('connection', function (socket) {
	console.log("Nova conexão aberta:", socket.id);

	socket.on('add viewer', function (type) {
		console.log('New screen viewer', type);
		socket.join('room');
		if(type === 'main'){
			game.setSocket(socket);
		}
	});

	socket.on('add user', function (color) {
		game.newUser(socket, color);
	});

	socket.on('reset', function (color) {
		console.log('Reseting game');
		game.reset();
	});

	socket.on('action', function (command) {
		game.onUserCommand(socket, command);
	});

	socket.on('disconnect', function () {
		const isGameSocket = game.socket === null || game.socket.id === socket.id;
		if(isGameSocket){
			game.setSocket(null);
		}else{
			game.removeUser(socket);
		}
	});
});

