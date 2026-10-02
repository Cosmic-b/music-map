export default {
  // Four times the visible world span gives half-sized pictures; cap at half.
  screenScale(camera) {
    return Math.max(0.5, 1 / Math.sqrt(camera.unitsPerPixel));
  },
  prepare(raw, settings, invalidate) {
    if (typeof raw.src !== 'string' || !raw.src.trim()) throw new Error(`Missing picture src: ${raw.id}`);
    const width = Number(raw.width ?? 120);
    const height = Number(raw.height ?? 120);
    if (![width, height].every(value => Number.isFinite(value) && value > 0)) {
      throw new Error(`Invalid picture dimensions: ${raw.id}`);
    }
    const image = new Image();
    const state = { width, height, image, status: 'loading' };
    image.onload = () => { state.status = 'ready'; invalidate(); };
    image.onerror = () => { state.status = 'error'; invalidate(); };
    image.src = raw.src;
    return { width, height, asset: state };
  },
  draw(ctx, object, point) {
    const { width, height, asset } = object;
    const { image, status } = asset;
    const left = point.x - width / 2;
    const top = point.y - height / 2;
    if (status === 'ready') {
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      ctx.drawImage(image, point.x - w / 2, point.y - h / 2, w, h);
    } else {
      ctx.strokeStyle = '#888888';
      ctx.strokeRect(left, top, width, height);
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '11px monospace';
      ctx.fillText(status === 'error' ? 'Image unavailable' : 'Loading…', left + 6, point.y, Math.max(1, width - 12));
    }
  },
};
