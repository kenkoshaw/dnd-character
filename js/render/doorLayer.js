import { ctx } from '../campaign.js';

export function createDoorLayer(worldEl, beforeEl) {
  const container = document.createElement('div');
  container.id = 'doors';
  worldEl.insertBefore(container, beforeEl);

  function doorStyle(d) {
    const len = ctx.grid.cellPx * 1.06, thick = ctx.grid.cellPx * 0.28;
    const w = d.orientation === 'h' ? len : thick;
    const h = d.orientation === 'h' ? thick : len;
    return `width:${w}px;height:${h}px;left:${d.x - w / 2}px;top:${d.y - h / 2}px`;
  }

  function render(doors) {
    container.querySelectorAll('.door[data-door-id]').forEach(el => el.remove());
    if (!ctx.grid || !(ctx.grid.cellPx > 0)) return;
    for (const [id, d] of Object.entries(doors || {})) {
      const el = document.createElement('div');
      el.className = 'door';
      el.dataset.doorId = id;
      el.style.cssText = doorStyle(d);
      container.appendChild(el);
    }
  }

  // Hover preview element for the door tool (kept out of render()'s wipe)
  const preview = document.createElement('div');
  preview.className = 'door';
  preview.style.cssText = 'opacity:.5;display:none;pointer-events:none';
  container.appendChild(preview);
  function showPreview(d) {
    // pointer-events:none — the preview tracks the cursor and must never
    // swallow the click meant for an existing door underneath it
    preview.style.cssText = doorStyle(d) + ';opacity:.5;pointer-events:none';
    preview.style.display = 'block';
  }
  function hidePreview() { preview.style.display = 'none'; }

  return { render, showPreview, hidePreview };
}
