import { screenToWorld } from './geometry.js';

// Creates the transformed world container + pan/zoom + pointer dispatch.
// Tools/tokens register handlers; first handler returning true wins, else pan.
// getMapSize (optional): () => {w, h} — bounds zoom-out to "whole map visible".
export function createWorld(viewport, getMapSize) {
  const el = document.createElement('div');
  el.id = 'world';
  viewport.appendChild(el);
  const view = { panX: 40, panY: 40, zoom: 0.4 };
  const handlers = [];
  let panPointer = null;
  const apply = () =>
    el.style.transform = `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
  apply();

  // Zoom-out floor: the whole map just fits the viewport (fallback 0.1).
  function minZoom() {
    const ms = getMapSize?.();
    return ms?.w > 0 && ms?.h > 0
      ? Math.min(4, Math.min(viewport.clientWidth / ms.w, viewport.clientHeight / ms.h))
      : 0.1;
  }

  function zoomAt(cx, cy, factor) {
    const z = Math.min(4, Math.max(minZoom(), view.zoom * factor));
    const w = screenToWorld(cx, cy, view);
    view.panX = cx - w.x * z;
    view.panY = cy - w.y * z;
    view.zoom = z;
    apply();
  }

  // Fit the whole map in the viewport, centered (also the zoom-out floor).
  function fitTo(w, h) {
    const z = Math.min(4, Math.min(viewport.clientWidth / w, viewport.clientHeight / h));
    view.zoom = z;
    view.panX = (viewport.clientWidth - w * z) / 2;
    view.panY = (viewport.clientHeight - h * z) / 2;
    apply();
  }

  // passive:false is safe: the app shell is overflow:hidden — nothing scrolls.
  // Zoom ONLY on pinch (ctrlKey wheel) or a real mouse wheel; two-finger
  // trackpad swipes pan the map instead.
  viewport.addEventListener('wheel', e => {
    e.preventDefault();
    const isPinch = e.ctrlKey;
    const isMouseWheel = e.deltaMode !== 0 || (Math.abs(e.deltaY) >= 100 && e.deltaX === 0);
    if (isPinch || isMouseWheel) {
      // Pinch deltas are small and frequent; wheel notches are big and sparse.
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (isPinch ? 0.01 : 0.0008)));
    } else {
      view.panX -= e.deltaX;
      view.panY -= e.deltaY;
      apply();
    }
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
    el, view, fitTo,
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
