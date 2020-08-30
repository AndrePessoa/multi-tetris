const logger = require('../libs/logger');

const Blocks = require('./blocks');
// const GAME_COLUMNS = 5;

class Grid {
	constructor(height, width) {
		this.height = height;
		this.width = width;
		this.reset();
	}

	reset() {
		this.blocks = new Blocks(this.height, this.width);
	}

	snapshot() {
		return this.blocks.clone();
	}

	freezeBlocks(blocks) {
		blocks.forEach((block) => {
			block.active = false;
		});
		this.blocks.addBlocks(blocks);
		return blocks;
	}

	removeLine(n) {
		let x; let y; const
			removedBlocks = [];
		for (y = n; y >= 0; --y) {
			for (x = 0; x < this.width; ++x) {
				if (y === n) {
					logger.log('removendo block: ', x, y);
					// remove last line
					removedBlocks.push(this.blocks.removeBlock({ x, y }));
				}
				const b = (y === 0) ? null : this.blocks.getBlock(x, y - 1);
				logger.log('movendo block: ', x, y);
				// move all above lines
				this.blocks.setBlock(x, y, b);
			}
		}
		return removedBlocks;
	}

	removeLines() {
		if (!this.blocks) return 0;

		let x; let y; let complete; let n = 0; let
			removedBlocks = [];
		for (y = this.height; y > 0; --y) {
			complete = true;
			for (x = 0; x < this.width; ++x) {
				if (!this.blocks.getBlock(x, y)) complete = false;
			}
			if (complete) {
				// let u;
				for (x = 0; x < this.width; ++x) {
					// u = users.getById( getBlock(x, y).userId );
					// if( u ) u.addScore(1);
				}
				removedBlocks = this.removeLine(y);
				y += 1; // recheck same line
				n++;
			}
		}

		return { rows: n, removedBlocks };
	}
}

module.exports = Grid;
