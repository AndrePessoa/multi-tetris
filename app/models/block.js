class Block {
	constructor(stats) {
		this.x = stats.x || 0;
		this.y = stats.y || 0;
		this.user_id = stats.user_id;
		this.color = stats.color || 'rgba(100, 100, 100, .5)';
		this.active = stats.active !== undefined ? stats.active : true;
		this.ghost = stats.ghost !== undefined ? stats.ghost : false;
	}
}

module.exports = Block;
