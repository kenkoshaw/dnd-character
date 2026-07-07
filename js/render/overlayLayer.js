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

  // rulers = [{startX, startY, x, y, speed|null, own?}]
  // Your OWN drag always shows its ruler — it's core drag feedback. The 📏
  // toggle only governs whether you also see other players' drags.
  function drawRulers(rulers) {
    sizeToMap();
    svg.innerHTML = '';
    if (!ctx.grid) return;
    const showRemote = rulerOn();
    for (const r of rulers) {
      if (!r.own && !showRemote) continue;
      const ft = distanceFt({ x: r.startX, y: r.startY }, { x: r.x, y: r.y }, ctx.grid);
      const over = r.speed != null && ft > r.speed;
      const color = over ? '#e05050' : '#52c46a'; // red past walk speed, else green
      const z = ctx.world.view.zoom;
      const line = document.createElementNS(svg.namespaceURI, 'line');
      line.setAttribute('x1', r.startX); line.setAttribute('y1', r.startY);
      line.setAttribute('x2', r.x); line.setAttribute('y2', r.y);
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', 4 / z);
      line.setAttribute('stroke-dasharray', '10 7');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
      const dot = document.createElementNS(svg.namespaceURI, 'circle');
      dot.setAttribute('cx', r.startX); dot.setAttribute('cy', r.startY);
      dot.setAttribute('r', 5 / z);
      dot.setAttribute('fill', color);
      svg.appendChild(dot);
      const text = document.createElementNS(svg.namespaceURI, 'text');
      text.setAttribute('x', r.x + 14); text.setAttribute('y', r.y - 14);
      text.setAttribute('fill', over ? '#e05050' : '#fff');
      text.setAttribute('font-size', 18 / z);
      text.setAttribute('paint-order', 'stroke'); text.setAttribute('stroke', '#000');
      text.setAttribute('stroke-width', 3 / z);
      text.textContent = `${ft} ft`;
      svg.appendChild(text);
    }
  }
  return { drawRulers };
}
