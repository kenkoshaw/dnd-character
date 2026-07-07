import { distanceFt } from '../geometry.js';
import { ctx } from '../campaign.js';

const rulerOn = () => localStorage.getItem('vtt_ruler') !== 'off';

export function createOverlayLayer(worldEl) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'overlay';
  worldEl.appendChild(svg);

  function sizeToMap() {
    svg.setAttribute('width', ctx.mapSize.w);
    svg.setAttribute('height', ctx.mapSize.h);
  }

  // rulers = [{startX, startY, x, y, speed|null}]
  function drawRulers(rulers) {
    sizeToMap();
    svg.innerHTML = '';
    if (!rulerOn() || !ctx.grid) return;
    for (const r of rulers) {
      const ft = distanceFt({ x: r.startX, y: r.startY }, { x: r.x, y: r.y }, ctx.grid);
      const over = r.speed != null && ft > r.speed;
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', r.startX); line.setAttribute('y1', r.startY);
      line.setAttribute('x2', r.x); line.setAttribute('y2', r.y);
      line.setAttribute('stroke', over ? '#e05050' : '#6cf');
      line.setAttribute('stroke-width', 3 / ctx.world.view.zoom);
      line.setAttribute('stroke-dasharray', '8 6');
      svg.appendChild(line);
      const text = document.createElementNS(svg.namespaceURI, 'text');
      text.setAttribute('x', r.x + 14); text.setAttribute('y', r.y - 14);
      text.setAttribute('fill', over ? '#e05050' : '#fff');
      text.setAttribute('font-size', 18 / ctx.world.view.zoom);
      text.setAttribute('paint-order', 'stroke'); text.setAttribute('stroke', '#000');
      text.setAttribute('stroke-width', 3 / ctx.world.view.zoom);
      text.textContent = `${ft} ft`;
      svg.appendChild(text);
    }
  }
  return { drawRulers };
}
