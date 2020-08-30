const Block = require('./block');

const DIR = {
	UP: 0,
	RIGHT: 1,
	DOWN: 2,
	LEFT: 3,
	MIN: 0,
	MAX: 3,
};

class Piece {
	constructor(ntype) {
		this.type 	= ntype;
		this.dir = null;
		this.color = null;
		this.x 		= 0;
		this.y 		= 0;
		this.userId = false;
		this.ghost = false;
	}

	static unoccupied(blocks) {
		return blocks;
	}

	clone() {
		const clone = new Piece(this.type);
		clone.dir = this.dir;
		clone.color = this.color;
		clone.x = this.x;
		clone.y = this.y;

		return clone;
	}

	move(dir) {
		let { x, y } = this;
		switch (dir) {
		case DIR.RIGHT: x += 1; break;
		case DIR.LEFT: x -= 1; break;
		case DIR.DOWN: y += 1; break;
		default: break;
		}
		const impact = this.unoccupied(this.getBlocks({ x, y }));
		if (impact) {
			this.x = x;
			this.y = y;
			return impact;
		}
		return impact;
	}

	getBlocks(altAttrs) {
		const attrs = { ...this, ...altAttrs };
		let bit; let row = 0; let col = 0; const
			blocks = attrs.type.blocks[attrs.dir];
		const result = [];
		for (bit = 0x8000; bit > 0; bit >>= 1) {
			if (blocks & bit) {
				result.push(new Block({
					user_id: attrs.userId,
					x: attrs.x + col,
					y: attrs.y + row,
					color: attrs.color,
				}));
			}
			if (++col === 4) {
				col = 0;
				++row;
			}
		}
		return result;
	}

	rotate() {
		const newdir = (this.dir === DIR.MAX ? DIR.MIN : this.dir + 1);

		if (this.unoccupied(this.getBlocks({ dir: newdir }))) {
			this.dir = newdir;
			return true;
		}
		return false;
	}

	drop() {
		return this.move(DIR.DOWN);
	}
}


module.exports = {
	Piece,
	DIR,
};
