const { io } = require('./routes');
const game = require('./controllers/game');

io.on('connection', (socket) => {
	// console.log('Nova conexão aberta:', socket.id);

	socket.on('add viewer', (type) => {
		// console.log('New screen viewer', type);
		socket.join('room');
		if (type === 'main') {
			game.setSocket(socket);
		}
	});

	socket.on('add user', (color) => {
		game.newUser(socket, color);
	});

	socket.on('reset', () => {
		// console.log('Reseting game');
		game.reset();
	});

	socket.on('action', (command) => {
		game.onUserCommand(socket, command);
	});

	socket.on('disconnect', () => {
		const isGameSocket = game.socket === null || game.socket.id === socket.id;
		if (isGameSocket) {
			game.setSocket(null);
		} else {
			game.removeUser(socket);
		}
	});
});
