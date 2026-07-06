// Map image layer. Never interactive (pointer-events:none in CSS).
export function createMapLayer(worldEl) {
  const img = document.createElement('img');
  img.id = 'mapImg';
  img.draggable = false;
  worldEl.appendChild(img);
  return {
    setImage({ b64, w, h }) {
      img.src = b64;
      worldEl.style.width = `${w}px`;
      worldEl.style.height = `${h}px`;
    },
    clear() {
      img.removeAttribute('src');
      worldEl.style.width = worldEl.style.height = '0px';
    },
  };
}
