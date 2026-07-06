import { screenToWorld } from './geometry.js';

// Creates the transformed world container + pan/zoom + pointer dispatch.
// Tools/tokens register handlers; first handler returning true wins, else pan.
export function createWorld(viewport) {
  const el = document.createElement('div');
  el.id = 'world';
  viewport.appendChild(el);
  const view = { panX: 40, panY: 40, zoom: 0.4 };
  const handlers = [];
  const apply = () =>
    el.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
  apply();

  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    const z = Math.min(4, Math.max(0.1, view.zoom * factor));
    const w = screenToWorld(e.clientX, e.clientY, view);
    view.panX = e.clientX - w.x * z;
    view.panY = e.clientY - w.y * z;
    view.zoom = z;
    apply();
  }, { passive: false });

  viewport.addEventListener('pointerdown', e => {
    if (e.button === 2) return; // right-click → context menus
    for (const h of handlers) if (h(e)) return;
    startPan(e);
  });

  function startPan(e) {
    const sx = e.clientX - view.panX, sy = e.clientY - view.panY;
    const move = ev => { view.panX = ev.clientX - sx; view.panY = ev.clientY - sy; apply(); };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  }

  return {
    el, view,
    registerHandler: fn => handlers.unshift(fn), // later registrations take priority
    toWorld: e => screenToWorld(e.clientX, e.clientY, view),
  };
}
