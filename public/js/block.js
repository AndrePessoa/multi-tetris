// BLOCK

const Block = {
  drawBlock: function (ctx, x, y, dx, dy, color, active) {
    const strokeWidth = 2;
    const [marginX, marginY] = [ dx, dy ].map((val) => (Math.floor(val * .075) * 2 + strokeWidth));
    const marginM = (marginX + marginY) / 2;
    // console.log(dx, dy, marginX, marginY, marginM);
    ctx.fillStyle = active ? 'transparent' : color;
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.shadowColor = color.replace(', 1 )', ', 0.25 )');
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 5 * marginM;
    this.drawRoundRect(
      ctx,
      Math.round(x * dx + marginX/2),
      Math.round(y * dy + marginY/2), 
      Math.round(dx - marginX),
      Math.round(dy - marginY),
      marginM - strokeWidth
    );
    ctx.fill();
    ctx.stroke();
    // ctx.fillRect(x * dx + 1.5, y * dy + 1.5, dx - 3, dy - 3);
    // if (active) ctx.fillRect(x * dx + 1.5, y * dy + 1.5, dx - 3, dy - 3);
    // if (!active) ctx.strokeRect(x * dx, y * dy, dx, dy);
  },
  drawRoundRect: function(ctx, x, y, width, height, radius) {
    // ctx.strokeRect(x, y, width, height);
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    return ctx;
  },
}
