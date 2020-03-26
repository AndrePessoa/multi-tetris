
class Blocks {
	constructor(height, width){
		this.height = height;
		this.width = width;
		this.bitmap = [];
		this.blocks = [];
		this.buildGrid(height, width);
	}
	buildGrid(height, width){
		this.bitmap = [];
		for(var x = width - 1; x >= 0; x-- ){
			this.bitmap[x] = [];
			for(var y = height; y > 0; y-- ){
				this.bitmap[x].push(null);
			}
		}
	}
	addBlock(block){
		const xExists = this.bitmap[block.x] !== undefined;
		const xyExists = xExists && this.bitmap[block.x][block.y] !== undefined;
		if( !xyExists ) return false;

		this.setBlock(block.x, block.y, block);
		this.blocks.push(block);
	}
	addBlocks(blocks){
		blocks.forEach(block => {
			this.addBlock(block);
		});
	}
	getBlock(x,y){
		return (this.bitmap[x] ? this.bitmap[x][y] : null);
	}
	removeBlock(block){
		const index = this.blocks.findIndex((b)=>(b.x === block.x && b.y === block.y));
		if(index > -1){
			const removedBlock = this.blocks.splice(index,1);
			this.setBlock(block.x, block.y, null);
			return removedBlock[0];
		}
	}
	setBlock(x,y, value){
		if(value) {
			value.x = x;
			value.y = y;
		}
		this.bitmap[x][y] = value;
	}
	clone(){
		const clone = new Blocks(this.height, this.width);
		clone.addBlocks(this.blocks);
		return clone;
	}
	occupied(blocks){
		var result = false;
		blocks.forEach((block)=>{
			if(result) return true;
			const isOutsideArea = (block.x < 0) || (block.x >= this.width) || (block.y >= this.height);
			const isOccupied = this.getBlock(block.x, block.y);
			// console.log(block.y, block.x, isOutsideArea, isOccupied, this.width, this.height);
			result = (isOutsideArea || isOccupied);
		});
		return result;
	}
}

const GAME_COLUMNS = 5;

class Grid {
	constructor(height, width){
		this.height = height;
		this.width = width;
		this.reset();
	}
	reset(){
		this.blocks = new Blocks(this.height, this.width);
	}
	snapshot(){
		return this.blocks.clone();
	}
	freezeBlocks(blocks){
		blocks = blocks.map((block)=>{ block.active = false; return block; })
		this.blocks.addBlocks(blocks);
	}
	/*
	eachblock(type, x, y, dir, callback) {
		var bit, row = 0, col = 0, blocks = type.blocks[dir];
		for(bit = 0x8000 ; bit > 0 ; bit = bit >> 1) {
			if (blocks & bit) {
				callback(x + col, y + row);
			}
			if (++col === 4) {
				col = 0;
				++row;
			}
		}
	}
	setBlock(x,y,type){
		this.blocks[x] = this.blocks[x] || [];
		this.blocks[x][y] = type;
		// invalidate();
	}
	getBlock(x,y){
		return (this.blocks[x] ? this.blocks[x][y] : null);
	}
	occupied(type, x, y, dir) {
		var result = false;
		this.eachblock(type, x, y, dir, function(x, y) {
			const isOutsideArea = (x < 0) || (x >= nx) || (y < 0) || (y >= ny);
			const isOccupied = this.getBlock(x,y) !== null;
			result = result && (isOutsideArea || isOccupied);
		});
		return result;
	}
	unoccupied(type, x, y, dir) {
		return !this.occupied(type, x, y, dir);
	}
	*/
	removeLine(n) {
		var x, y, removedBlocks = [];
		for(y = n ; y >= 0 ; --y) {
			for(x = 0 ; x < this.width ; ++x){
				if(y === n){
					// console.log('removendo block: ', x, y);
					// remove last line
					removedBlocks.push(this.blocks.removeBlock({x, y}));
				}
				const b = (y == 0) ? null : this.blocks.getBlock(x, y-1);
				// console.log('movendo block: ', x, y);
				// move all above lines
				this.blocks.setBlock(x, y, b);
				
			}
		}
		return removedBlocks;
	}
	removeLines() {
		if(!this.blocks) return 0;

		var x, y, complete, n = 0, removedBlocks = [];
		for(y = this.height ; y > 0 ; --y) {
			complete = true;
			for(x = 0 ; x < this.width ; ++x) {
				if (!this.blocks.getBlock(x, y)) complete = false;
			}
			if (complete) {
				var u;
				for(x = 0 ; x < this.width ; ++x) {
					// u = users.getById( getBlock(x, y).userId );
					// if( u ) u.addScore(1);
				}
				removedBlocks = this.removeLine(y);
				y = y + 1; // recheck same line
				n++;
			}
		}

		return { rows: n, removedBlocks };
	}
}

module.exports = { Grid };