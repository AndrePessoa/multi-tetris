const Block = require('./block');

const DIR = {
	UP: 0,
	RIGHT: 1,
	DOWN: 2,
	LEFT: 3,
	MIN: 0,
	MAX: 3
}

const Piece = function( ntype ){
	this.type 	= ntype;
	this.dir  	= null;
	this.color  = null;
	this.x 		= 0;
	this.y 		= 0;
	this.userId = false;
};

Piece.prototype.unoccupied = function(blocks) {
	return true;
}
Piece.prototype.move = function(dir) {
	var { x, y } = this;
	switch(dir) {
		case DIR.RIGHT: x = x + 1; break;
		case DIR.LEFT:  x = x - 1; break;
		case DIR.DOWN:  y = y + 1; break;
	}
	if (this.unoccupied(this.getBlocks({x,y}))) {
		this.x = x;
		this.y = y;
		return true;
	}
	else {
		return false;
	}
}
Piece.prototype.getBlocks = function(altAttrs){
	var attrs = Object.assign({}, this, altAttrs);
	var bit, row = 0, col = 0, blocks = attrs.type.blocks[attrs.dir];
	var result = [];
	for(bit = 0x8000 ; bit > 0 ; bit = bit >> 1) {
		if (blocks & bit) {
			result.push(new Block({
				user_id: attrs.userId,
				x: attrs.x + col,
				y: attrs.y + row,
				color: attrs.color
			}));
		}
		if (++col === 4) {
			col = 0;
			++row;
		}
	}
	return result;
}
Piece.prototype.rotate = function() {
	var newdir = (this.dir == DIR.MAX ? DIR.MIN : this.dir + 1);

	if (this.unoccupied(this.getBlocks({dir:newdir}))) {
		this.dir = newdir;
		return true;
	}
	return false;
}
Piece.prototype.drop = function() {
	return this.move(DIR.DOWN);
}

module.exports = {
	Piece,
	DIR
};