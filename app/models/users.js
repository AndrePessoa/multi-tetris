const USERSTATUS = {};
USERSTATUS.LOGIN = 1;
USERSTATUS.READY = 2;
USERSTATUS.PLAYING = 3;

const users = {
	pos: 0,
	activeMaxAmmount: 1,
	list: [],
	users: {},
	addUser: function( user ){
		var has = false

		if(this.users[user.id]){
			return this.users[user.id];
		}

		for (var i = this.list.length - 1; i >= 0; i--) {
			has = has || ( this.list[i].id == user.socket.id );
		};

		if( !has ){
			user.socket.emit('added user', user.piece);
			this.list.push( user );
			this.users[user.id] = user;
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
		return this.list.filter((user) => { return user.status === USERSTATUS.PLAYING });
	},
	getLogged: () => {
		return this.list.filter((user) => { return user.status !== USERSTATUS.LOGIN });
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


module.exports = {
	users,
	USERSTATUS
};