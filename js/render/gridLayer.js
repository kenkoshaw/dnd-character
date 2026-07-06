// Grid overlay canvas, sized to the map image.
export function createGridLayer(worldEl) {
  const canvas = document.createElement('canvas');
  canvas.id = 'gridCanvas';
  worldEl.appendChild(canvas);

  function draw(grid, mapW, mapH) {
    canvas.width = mapW; canvas.height = mapH;
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, mapW, mapH);
    if (!grid || grid.visible === false) return;
    g.strokeStyle = grid.color || '#000000';
    g.globalAlpha = grid.opacity ?? 0.4;
    g.lineWidth = 1;
    g.beginPath();
    const startX = ((grid.offX % grid.cellPx) + grid.cellPx) % grid.cellPx;
    const startY = ((grid.offY % grid.cellPx) + grid.cellPx) % grid.cellPx;
    for (let x = startX; x <= mapW; x += grid.cellPx) { g.moveTo(x, 0); g.lineTo(x, mapH); }
    for (let y = startY; y <= mapH; y += grid.cellPx) { g.moveTo(0, y); g.lineTo(mapW, y); }
    g.stroke();
  }
  return { draw };
}
