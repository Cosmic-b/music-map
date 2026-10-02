import { Camera, LEVELS } from './camera.mjs';
import { prepareObjects, drawObjects } from './objects/index.mjs';
import { attachGestures } from './gestures.mjs';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const camera = new Camera();
const grid = 50;
let settings, objects, width, height, pending = false;

async function readJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

function invalidate() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; render(); });
}

function line(x1, y1, x2, y2) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

function render() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  // Levels change world-to-screen coordinates. The bitmap stays at device
  // resolution: every line and object is drawn fresh at its new screen position.
  const ratio = Math.min(window.devicePixelRatio || 1, 4,
    Math.sqrt(16_000_000 / (width * height)));
  const pixelWidth = Math.max(1, Math.round(width * ratio));
  const pixelHeight = Math.max(1, Math.round(height * ratio));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  ctx.fillStyle = settings['background-color'];
  ctx.fillRect(0, 0, width, height);

  const topLeft = camera.toWorld(0, 0, width, height);
  const bottomRight = camera.toWorld(width, height, width, height);
  const origin = camera.toScreen(0, 0, width, height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ffffff12';
  ctx.beginPath();
  for (let x = Math.ceil(topLeft.x / grid) * grid; x <= bottomRight.x; x += grid) {
    const screen = camera.toScreen(x, 0, width, height);
    line(screen.x, 0, screen.x, height);
  }
  for (let y = Math.ceil(bottomRight.y / grid) * grid; y <= topLeft.y; y += grid) {
    const screen = camera.toScreen(0, y, width, height);
    line(0, screen.y, width, screen.y);
  }
  ctx.stroke();

  ctx.strokeStyle = '#ffffff55';
  ctx.beginPath();
  line(0, origin.y, width, origin.y);
  line(origin.x, 0, origin.x, height);
  ctx.stroke();
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '11px monospace';
  if (origin.y >= 0 && origin.y <= height) {
    const labelY = Math.max(14, origin.y - 8);
    ctx.fillText('X+', width - 25, labelY);
    ctx.fillText('X−', 8, labelY);
  }
  if (origin.x >= 0 && origin.x <= width) {
    const labelX = Math.min(width - 25, origin.x + 8);
    ctx.fillText('Y+', labelX, 17);
    ctx.fillText('Y−', labelX, height - 8);
  }
  ctx.fillText('0', origin.x + 8, origin.y + 16);

  drawObjects(ctx, objects, camera, width, height);
  document.querySelector('#zoom-level').value = `${camera.level} — ×${1 / camera.unitsPerPixel}`;
  document.querySelector('#zoom-in').disabled = camera.level === 1;
  document.querySelector('#zoom-out').disabled = camera.level === LEVELS.length;
}

try {
  const [rawSettings, rawMap] = await Promise.all([readJSON('/jsons/settings.json'), readJSON('/jsons/map.json')]);
  settings = Object.assign({ 'dot-size': 5, 'background-color': '#222222' }, ...rawSettings);
  settings['dot-size'] = Number(settings['dot-size']);
  if (!Number.isFinite(settings['dot-size']) || settings['dot-size'] <= 0) throw new Error('Invalid dot-size');
  objects = prepareObjects(rawMap, settings, invalidate);
  for (const [id, step] of [['zoom-in', -1], ['zoom-out', 1]]) {
    document.getElementById(id).addEventListener('click', () => {
      const rect = canvas.getBoundingClientRect();
      camera.setLevelAt(camera.level + step, rect.width / 2, rect.height / 2, rect.width, rect.height);
      invalidate();
    });
  }
  new ResizeObserver(invalidate).observe(canvas);
  window.addEventListener('resize', invalidate);
  attachGestures(canvas, camera, invalidate);
  let wheelDelta = 0, lastWheelTime = -Infinity, lastStepTime = -Infinity;
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
    if (!delta) return;
    if (event.timeStamp - lastWheelTime > 180 || Math.sign(delta) !== Math.sign(wheelDelta)) wheelDelta = 0;
    lastWheelTime = event.timeStamp;
    wheelDelta += delta;
    // Accumulate small trackpad deltas and limit rapid wheel bursts to steps.
    if (Math.abs(wheelDelta) < 50 || event.timeStamp - lastStepTime < 160) return;
    camera.setLevelAt(camera.level + Math.sign(wheelDelta),
      event.clientX - rect.left, event.clientY - rect.top, rect.width, rect.height);
    wheelDelta = 0;
    lastStepTime = event.timeStamp;
    invalidate();
  }, { passive: false });
  invalidate();
} catch (error) {
  console.error(error);
  canvas.replaceWith(Object.assign(document.createElement('p'), { textContent: `Unable to load canvas: ${error.message}` }));
}
