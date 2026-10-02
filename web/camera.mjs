// Pure world/screen math, independent of the DOM and rendering backend.
export const LEVELS = Object.freeze([8, 4, 2, 1, 0.5, 0.25, 0.125, 0.0625]);

export class Camera {
  constructor() { this.x = 0; this.y = 0; this.level = 4; }

  get unitsPerPixel() { return LEVELS[this.level - 1]; }

  toScreen(x, y, width, height) {
    return { x: width / 2 + (x - this.x) / this.unitsPerPixel,
      y: height / 2 - (y - this.y) / this.unitsPerPixel };
  }

  toWorld(x, y, width, height) {
    return { x: this.x + (x - width / 2) * this.unitsPerPixel,
      y: this.y - (y - height / 2) * this.unitsPerPixel };
  }

  pan(dx, dy) { this.x -= dx * this.unitsPerPixel; this.y += dy * this.unitsPerPixel; }

  setLevelAt(level, x, y, width, height) {
    if (!Number.isFinite(level)) return;
    const before = this.toWorld(x, y, width, height);
    this.level = Math.min(LEVELS.length, Math.max(1, Math.round(level)));
    const after = this.toWorld(x, y, width, height);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
  }
}
