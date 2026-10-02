import dot from './dot.mjs';
import picture from './picture.mjs';

// Nested dispatch keeps type-specific loading and drawing out of the scene loop.
export const objectTypes = {
  primitive: { dot },
  media: { picture },
};
const aliases = { blank: ['primitive', 'dot'], dot: ['primitive', 'dot'], picture: ['media', 'picture'] };

export function resolveType(type) {
  const path = typeof type === 'string'
    ? (Object.hasOwn(aliases, type) ? aliases[type] : [])
    : [type?.category, type?.name];
  const [category, name] = path;
  if (!Object.hasOwn(objectTypes, category) || !Object.hasOwn(objectTypes[category], name)) {
    throw new Error(`Unknown object type: ${JSON.stringify(type)}`);
  }
  return objectTypes[category][name];
}

export function prepareObjects(rawMap, settings, invalidate) {
  return rawMap.map(raw => {
    const renderer = resolveType(raw.type);
    const x = Number(raw.x), y = Number(raw.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`Invalid coordinates: ${raw.id}`);
    return { id: raw.id, x, y, renderer, ...renderer.prepare(raw, settings, invalidate) };
  });
}

export function drawObjects(ctx, objects, camera, width, height) {
  for (const object of objects) {
    const point = camera.toScreen(object.x, object.y, width, height);
    if (point.x + object.width / 2 < 0 || point.y + object.height / 2 < 0 ||
        point.x - object.width / 2 > width || point.y - object.height / 2 > height) continue;
    ctx.save();
    object.renderer.draw(ctx, object, point);
    ctx.restore();
  }
}
