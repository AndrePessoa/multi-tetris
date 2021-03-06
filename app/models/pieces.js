const { Piece, DIR } = require('./piece');
const { random } = require('../libs/utils');

class Pieces {
	constructor() {
		this.pieces = [];
		this.piecesMaxCollection = 4;
		this.maxX = 100;
		this.types = [
			/* i */ { size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan' },
			/* j */ { size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue' },
			/* l */ { size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' },
			/* o */ { size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' },
			/* s */ { size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green' },
			/* t */ { size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' },
			/* z */ { size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red' },
		];
	}

	static rgbToColor(color) {
		return `rgba( ${color.r}, ${color.g}, ${color.b}, 1 )`;
	}

	randomPiece(color) {
		if (this.pieces.length === 0) {
			this.pieces = [];
			for (let i = this.types.length - 1; i >= 0; i--) {
				for (let j = this.piecesMaxCollection; j >= 0; j--) {
					this.pieces.push(this.types[i]);
				}
			}
		}

		const type = this.pieces.splice(random(0, this.pieces.length - 1), 1)[0];
		const ntype = {};

		const typesKeys = Object.keys(type);
		typesKeys.forEach((prop) => {
			ntype[prop] = type[prop];
		});

		const piece = new Piece(ntype);
		piece.color = Pieces.rgbToColor(color || 'white');
		piece.x		= Math.round(random(0, this.maxX - ntype.size));
		piece.dir 	= DIR.UP;

		return piece;
	}
}

module.exports = new Pieces();
