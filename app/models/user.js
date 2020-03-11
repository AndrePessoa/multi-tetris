const Pieces = require('../models/pieces');

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
	this.piece = Pieces.randomPiece( this.color, this );
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

var USERSTATUS = {};
USERSTATUS.LOGIN = 1;
USERSTATUS.READY = 2;
USERSTATUS.PLAYING = 3;

module.exports = { User, USERSTATUS };