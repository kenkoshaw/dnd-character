// Image downscale + re-encode for Firebase-friendly base64 payloads.
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

export function fitDimensions(w, h, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image — file may be corrupt or unsupported.'));
    };
    img.src = url;
  });
}

function encode(img, maxSide, type, quality) {
  const { w, h } = fitDimensions(img.naturalWidth, img.naturalHeight, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  if (type === 'image/jpeg') { // JPEG has no alpha; canvas flattens to black by default
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
  }
  g.drawImage(img, 0, 0, w, h);
  return { b64: canvas.toDataURL(type, quality), w, h };
}

// Map: JPEG, retry at lower quality/size until base64 ≤ ~2.8M chars (~2 MB binary).
export async function processMapImage(file) {
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Image larger than 8 MB — please resize it first.');
  const img = await loadImage(file);
  const attempts = [[3000, 0.85], [3000, 0.7], [2048, 0.7], [1600, 0.6]];
  for (const [maxSide, q] of attempts) {
    const out = encode(img, maxSide, 'image/jpeg', q);
    if (out.b64.length <= 2_800_000) return out;
  }
  throw new Error('Could not compress map under 2 MB.');
}

// Token/monster: 128px WebP. (Safari lacks WebP toDataURL and silently emits
// PNG instead — acceptable: alpha preserved, payload bounded by the 128px cap.)
export async function processTokenImage(file) {
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Image larger than 8 MB — please resize it first.');
  const img = await loadImage(file);
  return encode(img, 128, 'image/webp', 0.9);
}
