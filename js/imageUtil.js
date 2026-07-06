// Image downscale + re-encode for Firebase-friendly base64 payloads.
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

export function fitDimensions(w, h, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function encode(img, maxSide, type, quality) {
  const { w, h } = fitDimensions(img.naturalWidth, img.naturalHeight, maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
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

// Token/monster: 128px WebP.
export async function processTokenImage(file) {
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Image larger than 8 MB — please resize it first.');
  const img = await loadImage(file);
  return encode(img, 128, 'image/webp', 0.9);
}
