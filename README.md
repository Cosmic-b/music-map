Run `go run ./go` from the project root, then open http://localhost:8080.
The server also binds to local Tailscale addresses in `100.64.0.0/10`, detected
at startup, and prints their URLs. Restart after connecting Tailscale if needed.

Files are organized into `web/` (frontend and object renderers), `go/` (local
server), `jsons/` (map and settings), and `assets/` (images and other media).
`go/canvas/` is reserved for the future Go canvas engine. The root `go.mod`
defines the Go module. The server serves `web/` at `/` and exposes `/jsons/`
and `/assets/` separately.

The page contains a centered 90vw × 90vh canvas. Drag to pan; scroll to zoom
around the pointer. World coordinates start at the center, with +X right and
+Y up. Grid lines are 50 world units apart. Axes and the origin move with the camera.

`jsons/map.json` supplies objects (`blank` and `dot` both render as dots).
`jsons/settings.json` supplies the background color and dot diameter in CSS pixels.
Numeric strings in the existing JSON are supported. Reload after editing JSON.

Changing levels recalculates world-to-screen positions and redraws the grid and
objects. Dot diameter, line width, and text size stay fixed. Pictures shrink
with the square root of the canvas scale, down to half their original size.
Backing resolution follows device pixel ratio, independently of the level,
and is capped at 4× / 16 million pixels.
Camera math lives in `web/camera.mjs`, separate from DOM events and Canvas2D drawing
in `web/app.js`, to leave a small boundary for a future WebAssembly implementation.
This prototype uses JavaScript for rendering; Go only serves the files locally.

Use the − / + buttons to move through four levels; the current level is displayed
between them: `1 — ×1`, `2 — ×0.5`, `3 — ×0.25`, `4 — ×0.125`.
Level 1 is the default base layout with 50px grid spacing, followed by 25px,
12.5px, and 6.25px. Levels use 1, 2, 4, and 8 world units per CSS pixel. Zooming in stops at the base
layout. Buttons preserve the camera center; wheel steps preserve
the world point under the pointer. Each level redraws 50-unit grid lines at their
new relative positions. Both ends of each visible axis are labeled X+/X− and Y+/Y−.

On touchscreens, drag with one finger to pan, or use two fingers to pan and
pinch through the four levels. Pinch steps keep the world point under the
finger midpoint anchored. Lifting one finger continues panning without a jump.
The zoom buttons have 44px touch targets and the canvas follows mobile viewport
height changes. Touch uses the same picture scaling and visibility rules.

Objects use nested type descriptors, for example:

```json
{"id":"cover","type":{"category":"media","name":"picture"},"x":-150,"y":100,"src":"/assets/picture.svg","width":160,"height":120,"hideAtLevel":4}
```

Dots use `{"category":"primitive","name":"dot"}`. Existing string types
`blank`, `dot`, and `picture` remain supported. Add types to the nested registry
in `web/objects/index.mjs` with their own `prepare` and `draw` implementations.
Unknown types produce an explicit loading error.

Pictures are centered on their world coordinates, preserve aspect ratio inside
their width/height box (default 120×120 CSS pixels at level 1). Picture size
multipliers are 1, approximately 0.707, 0.5, and 0.5 across levels 1–4. Image loading and failures display placeholders without blocking
the rest of the scene. The example picture is a local SVG; browser-supported
image formats such as PNG, JPEG, and WebP can also be used.

Every object supports `hideAtLevel`: a level from 1 to 4 at which it disappears
(and stays hidden farther out). For example, `4` shows it at levels 1–3.
Use `null` or omit the field to keep it visible at every level. Zooming back
in restores it. Existing map objects default to `null`.
