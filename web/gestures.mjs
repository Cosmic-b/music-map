// Pointer events share the same camera controls for mouse, pen, and touch.
export function attachGestures(canvas, camera, invalidate) {
  const pointers = new Map();
  let previous = null;
  let pinchDistance = 0;
  const pinchStep = 1.35;

  function snapshot() {
    const points = [...pointers.values()];
    if (!points.length) return null;
    if (points.length === 1) return { ...points[0], distance: 0 };
    const [a, b] = points;
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      distance: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  function rebase() {
    previous = snapshot();
    pinchDistance = previous?.distance || 0;
    canvas.classList.toggle('dragging', pointers.size > 0);
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || pointers.size >= 2) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    rebase();
  });

  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = snapshot();
    camera.pan(current.x - previous.x, current.y - previous.y);
    if (current.distance > 0 && pinchDistance > 0) {
      const steps = Math.trunc(Math.log(current.distance / pinchDistance) / Math.log(pinchStep));
      if (steps) {
        const rect = canvas.getBoundingClientRect();
        camera.setLevelAt(camera.level - steps, current.x - rect.left,
          current.y - rect.top, rect.width, rect.height);
        pinchDistance = current.distance;
      }
    } else {
      pinchDistance = current.distance;
    }
    previous = current;
    invalidate();
  });

  function release(event) {
    if (!pointers.delete(event.pointerId)) return;
    rebase();
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, release);
  }
}
