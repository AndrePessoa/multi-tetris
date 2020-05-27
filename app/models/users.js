const USERSTATUS = {
	LOGIN: 1,
	READY: 2,
	PLAYING: 3,
};

class Users {
	constructor() {
		this.pos = 0;
		this.activeMaxAmmount = 1;
		this.list = [];
		this.users = {};
	}

	addUser(user) {
		let has = false;

		if (this.users[user.id]) {
			return this.users[user.id];
		}

		for (let i = this.list.length - 1; i >= 0; i--) {
			has = has || (this.list[i].id === user.socket.id);
		}

		if (!has) {
			user.socket.emit('added user', user.piece);
			this.list.push(user);
			this.users[user.id] = user;
		}
		return user;
	}

	removeUser(socket) {
		const index = this.getPos(socket);
		if (index > -1) {
			delete this.list[index];
			this.list.splice(index, 1);
			if (index < this.pos) {
				this.pos--;
			}
		}
		return socket;
	}

	current() {
		return this.list
			.filter((user) => user.status === USERSTATUS.PLAYING)
			.sort((userA, userB) => {
				if (!userA.piece) return -1;
				if (!userB.piece) return 1;
				return userB.piece.y - userA.piece.y;
			});
	}

	getLogged() {
		return this.list
			.filter((user) => user.status !== USERSTATUS.LOGIN);
	}

	getPos(socket) {
		let index = -1;
		for (let i = this.list.length - 1; i >= 0; i--) {
			if (this.list[i].socket === socket) {
				index = i; break;
			}
		}
		return index;
	}

	getById(id) {
		for (let i = this.list.length - 1; i >= 0; i--) {
			if (this.list[i].id === id) return this.list[i];
		}
		return false;
	}

	get(offset) {
		let pos = this.pos + offset;
		pos = (pos < this.list.length - 1 && pos > 0) ? pos : 0;
		return this.list[pos];
	}

	next() {
		this.pos = (this.pos < this.list.length - 1) ? this.pos + 1 : 0;
	}

	startGame() {
		for (let i = this.list.length - 1; i >= 0; i--) {
			this.list[i].setStatus(USERSTATUS.PLAYING);
		}
	}

	stopGame() {
		for (let i = this.list.length - 1; i >= 0; i--) {
			this.list[i].setStatus(USERSTATUS.READY);
		}
	}
}


module.exports = {
	users: new Users(),
	USERSTATUS,
};
