import { screenToWorld } from './geometry.js';

// Creates the transformed world container + pan/zoom + pointer dispatch.
// Tools/tokens register handlers; first handler returning true wins, else pan.
export function createWorld(viewport) {
  const el = document.createElement('div');
  el.id = 'world';
  viewport.appendChild(el);
  const view = { panX: 40, panY: 40, zoom: 0.4 };
  const handlers = [];
  let panPointer = null;
  const apply = () =>
    el.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
  apply();

  // passive:false is safe: the app shell is overflow:hidden — nothing scrolls.
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
    if (panPointer !== null) return; // one pan at a time
    const sx = e.clientX - view.panX, sy = e.clientY - view.panY;
    viewport.setPointerCapture(e.pointerId); // keeps events coming even off-window
    panPointer = e.pointerId;
    const move = ev => {
      if (ev.pointerId !== panPointer) return;
      view.panX = ev.clientX - sx; view.panY = ev.clientY - sy; apply();
    };
    const stop = ev => {
      if (ev.pointerId !== panPointer) return;
      panPointer = null;
      viewport.removeEventListener('pointermove', move);
      viewport.removeEventListener('pointerup', stop);
      viewport.removeEventListener('pointercancel', stop);
      viewport.removeEventListener('lostpointercapture', stop);
    };
    viewport.addEventListener('pointermove', move);
    viewport.addEventListener('pointerup', stop);
    viewport.addEventListener('pointercancel', stop);
    viewport.addEventListener('lostpointercapture', stop);
  }

  return {
    el, view,
    registerHandler: fn => {
      handlers.unshift(fn); // later registrations take priority
      return () => {
        const i = handlers.indexOf(fn);
        if (i >= 0) handlers.splice(i, 1);
      };
    },
    toWorld: e => screenToWorld(e.clientX, e.clientY, view),
  };
}
