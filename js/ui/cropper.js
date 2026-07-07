import { MAX_SOURCE_BYTES } from '../imageUtil.js';

// Circle-crop an uploaded image: drag to position, slide to zoom. Resolves a
// 128px PNG data URL with a circular alpha mask, or null if cancelled.
// Throws (rejects) on unreadable/oversized files so callers can toast.
export function cropCircle(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_SOURCE_BYTES) {
      reject(new Error('Image larger than 8 MB — please resize it first.'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); build(img); };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image — file may be corrupt or unsupported.'));
    };
    img.src = url;

    function build(img) {
      const S = 280; // stage size; the crop circle spans the whole stage
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `<div class="modal" style="width:330px">
        <h2>Crop your token</h2>
        <p class="help">Drag the image to position it; the circle is what lands on the map.</p>
        <div class="crop-stage"><canvas width="${S}" height="${S}"></canvas></div>
        <label>Zoom</label>
        <input id="cropZoom" type="range" min="1" max="4" step="0.01" value="1">
        <button class="primary" id="cropOk">Use this crop</button>
        <button id="cropCancel">Cancel</button>
      </div>`;
      document.body.appendChild(wrap);
      const canvas = wrap.querySelector('canvas');
      const g = canvas.getContext('2d');
      const base = S / Math.min(img.naturalWidth, img.naturalHeight); // cover-fit
      let zoom = 1, ox = 0, oy = 0;

      const placement = () => {
        const sc = base * zoom;
        const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
        return { x: (S - w) / 2 + ox, y: (S - h) / 2 + oy, w, h };
      };

      function draw() {
        const { x, y, w, h } = placement();
        g.clearRect(0, 0, S, S);
        g.drawImage(img, x, y, w, h);
        g.save(); // dim everything outside the circle
        g.fillStyle = 'rgba(0,0,0,.55)';
        g.beginPath();
        g.rect(0, 0, S, S);
        g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2, true);
        g.fill();
        g.restore();
        g.strokeStyle = 'rgba(255,255,255,.8)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
        g.stroke();
      }
      draw();

      let drag = null;
      canvas.addEventListener('pointerdown', e => {
        drag = { x: e.clientX - ox, y: e.clientY - oy };
        try { canvas.setPointerCapture(e.pointerId); } catch {}
      });
      canvas.addEventListener('pointermove', e => {
        if (!drag) return;
        ox = e.clientX - drag.x;
        oy = e.clientY - drag.y;
        draw();
      });
      const end = () => { drag = null; };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      wrap.querySelector('#cropZoom').oninput = e => { zoom = Number(e.target.value); draw(); };

      wrap.querySelector('#cropCancel').onclick = () => { wrap.remove(); resolve(null); };
      wrap.querySelector('#cropOk').onclick = () => {
        const out = document.createElement('canvas');
        out.width = out.height = 128;
        const og = out.getContext('2d');
        og.beginPath();
        og.arc(64, 64, 64, 0, Math.PI * 2);
        og.clip();
        const k = 128 / S;
        const { x, y, w, h } = placement();
        og.drawImage(img, x * k, y * k, w * k, h * k);
        wrap.remove();
        resolve(out.toDataURL('image/png')); // PNG keeps the circular alpha
      };
    }
  });
}
