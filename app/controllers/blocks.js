class Blocks {
	constructor(height, width) {
		this.height = height;
		this.width = width;
		this.bitmap = [];
		this.blocks = [];
		this.buildGrid(height, width);
	}

	buildGrid(height, width) {
		this.bitmap = [];
		for (let x = width - 1; x >= 0; x--) {
			this.bitmap[x] = [];
			for (let y = height; y > 0; y--) {
				this.bitmap[x].push(null);
			}
		}
	}

	addBlock(block) {
		const xExists = this.bitmap[block.x] !== undefined;
		const xyExists = xExists && this.bitmap[block.x][block.y] !== undefined;
		if (!xyExists) return false;

		this.setBlock(block.x, block.y, block);
		this.blocks.push(block);
	}

	addBlocks(blocks) {
		blocks.forEach((block) => {
			this.addBlock(block);
		});
	}

	getBlock(x, y) {
		return (this.bitmap[x] ? this.bitmap[x][y] : null);
	}

	removeBlock(block) {
		const index = this.blocks.findIndex((b) => (b.x === block.x && b.y === block.y));
		if (index > -1) {
			const removedBlock = this.blocks.splice(index, 1);
			this.setBlock(block.x, block.y, null);
			return removedBlock[0];
		}
	}

	setBlock(x, y, value) {
		if (value) {
			value.x = x;
			value.y = y;
		}
		this.bitmap[x][y] = value;
	}

	clone() {
		const clone = new Blocks(this.height, this.width);
		clone.addBlocks(this.blocks);
		return clone;
	}

	occupied(blocks) {
		let result = false;
		blocks.forEach((block) => {
			if (result) return true;
			const isOutsideArea = (block.x < 0) || (block.x >= this.width) || (block.y >= this.height);
			const isOccupied = this.getBlock(block.x, block.y);
			result = (isOutsideArea || isOccupied);
		});
		return result;
	}
}
module.exports = Blocks;
