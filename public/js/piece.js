const Piece = function(canvas, nx, ny) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.type = null;
  this.x = 0;
  this.y = 0;
  this.dir = 1;
  this.active = false;

  this.nx = nx;
  this.ny = ny;
};

Piece.prototype.update = function(data){
  if(!data) return;
  const props = ['x', 'y', 'dir', 'color','type', 'active', 'ctx'];
  props.forEach((prop)=>{
    if(data[prop] !== undefined) this[prop] = data[prop];
  });
  return this;
};

Piece.prototype.eachblock = function(type, x, y, dir, fn) {
  let bit; let row = 0; let col = 0;
  const blocks = this.type.blocks[dir];

  for (bit = 0x8000; bit > 0; bit >>= 1) {
    if (blocks & bit) {
      fn(x + col, y + row);
    }
    if (++col === 4) {
      col = 0;
      ++row;
    }
  }
};

Piece.prototype.drawPiece = function() {
  const {dx, dy} = stage.getBlockPixels(this.canvas);
  this.eachblock(this.type, this.x, this.y, this.dir, (x, y) => {
    Block.drawBlock(this.ctx, x, y, dx, dy, this.color, true);
  });
  return this;
};

