/**
 * Pure-JS fallback Lottie rasterizer used when `inlottie` can't render
 * headless (the bundled v0.1.9-g build is a windowed viewer with no PNG
 * export flags). The fallback handles the small subset of Lottie produced by
 * our M0 templates and seeds — enough to drive the visual-diff pipeline for
 * `color-pulse`, `loader-pulse`, `spinner-arc`, and similar single-shape
 * animations:
 *
 *   - One or more shape layers (`ty: 4`)
 *   - Layer transform with constant or animated `p`, `s`, `r`, `o`
 *   - Shapes within a group: `el` (ellipse), `rc` (rect, basic), `fl` (fill)
 *
 * Anything more complex (paths, gradients, masks, precomps, text) falls back
 * to a transparent frame — the diff will still surface the change, it just
 * won't be pixel-perfect.
 *
 * We deliberately keep this small and dependency-light. `pngjs` is the only
 * outside dep and is already used elsewhere in the diff module.
 */

import { PNG } from "pngjs";

interface Vec2 {
  x: number;
  y: number;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface Keyframe {
  t: number;
  s?: number | number[];
}

interface AnimatedProp {
  a?: 0 | 1;
  k?: unknown;
}

interface LottieShape {
  ty: string;
  c?: AnimatedProp; // colour for fl
  o?: AnimatedProp; // opacity
  p?: AnimatedProp; // position (el, rc)
  s?: AnimatedProp; // size (el, rc) or scale (tr)
  r?: AnimatedProp; // rotation (tr)
  it?: LottieShape[]; // group children
}

interface LottieLayerKs {
  o?: AnimatedProp;
  p?: AnimatedProp;
  s?: AnimatedProp;
  r?: AnimatedProp;
  a?: AnimatedProp;
}

interface LottieLayer {
  ty?: number;
  ks?: LottieLayerKs;
  shapes?: LottieShape[];
  ip?: number;
  op?: number;
}

interface LottieAnimation {
  w?: number;
  h?: number;
  ip?: number;
  op?: number;
  layers?: LottieLayer[];
}

/**
 * Sample an animated property at frame `t`. Handles:
 *   - constant (`a: 0`) -> returns the constant value
 *   - keyframed (`a: 1`) -> linear interpolation between adjacent keyframes
 */
function sample(prop: AnimatedProp | undefined, t: number, fallback: number[]): number[] {
  if (!prop) return fallback;
  if (prop.a !== 1) {
    return toArr(prop.k, fallback);
  }
  const kfs = (prop.k as Keyframe[]) || [];
  if (kfs.length === 0) return fallback;
  if (t <= kfs[0].t) return toArr(kfs[0].s, fallback);
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (t >= a.t && t <= b.t) {
      const span = Math.max(1, b.t - a.t);
      const u = (t - a.t) / span;
      const sa = toArr(a.s, fallback);
      const sb = toArr(b.s, fallback);
      const out: number[] = [];
      for (let j = 0; j < Math.max(sa.length, sb.length); j++) {
        const va = sa[j] ?? fallback[j] ?? 0;
        const vb = sb[j] ?? fallback[j] ?? 0;
        out.push(va + (vb - va) * u);
      }
      return out;
    }
  }
  return toArr(kfs[kfs.length - 1].s, fallback);
}

function toArr(v: unknown, fallback: number[]): number[] {
  if (Array.isArray(v)) return v.map((n) => Number(n));
  if (typeof v === "number") return [v];
  return fallback;
}

function toScalar(v: number[], def: number): number {
  return v.length > 0 ? v[0] : def;
}

function colorRGBA(arr: number[]): RGBA {
  const r = clamp01(arr[0] ?? 0);
  const g = clamp01(arr[1] ?? 0);
  const b = clamp01(arr[2] ?? 0);
  const a = clamp01(arr[3] ?? 1);
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: Math.round(a * 255),
  };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Composite a filled ellipse over `pixels` (RGBA). The ellipse is centred at
 * `(cx, cy)` in the destination pixel space, with axis radii `(rx, ry)`.
 * Uses a half-pixel super-sample for cheap antialiasing on the boundary.
 */
function fillEllipse(
  pixels: Buffer,
  width: number,
  height: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: RGBA,
): void {
  if (rx <= 0 || ry <= 0 || color.a === 0) return;
  const minX = Math.max(0, Math.floor(cx - rx) - 1);
  const maxX = Math.min(width - 1, Math.ceil(cx + rx) + 1);
  const minY = Math.max(0, Math.floor(cy - ry) - 1);
  const maxY = Math.min(height - 1, Math.ceil(cy + ry) + 1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // 2×2 super-sample for cheap AA.
      let cover = 0;
      for (const dy of [-0.25, 0.25]) {
        for (const dx of [-0.25, 0.25]) {
          const nx = (x + 0.5 + dx - cx) / rx;
          const ny = (y + 0.5 + dy - cy) / ry;
          if (nx * nx + ny * ny <= 1) cover++;
        }
      }
      if (cover === 0) continue;
      const alpha = (cover / 4) * (color.a / 255);
      const idx = (y * width + x) * 4;
      const inv = 1 - alpha;
      pixels[idx + 0] = Math.round(pixels[idx + 0] * inv + color.r * alpha);
      pixels[idx + 1] = Math.round(pixels[idx + 1] * inv + color.g * alpha);
      pixels[idx + 2] = Math.round(pixels[idx + 2] * inv + color.b * alpha);
      pixels[idx + 3] = Math.min(
        255,
        Math.round(pixels[idx + 3] * inv + 255 * alpha),
      );
    }
  }
}

/**
 * Composite a filled axis-aligned rectangle. Used for `rc` shapes; rounded
 * corners are ignored (clamped to 0) for the fallback path.
 */
function fillRect(
  pixels: Buffer,
  width: number,
  height: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: RGBA,
): void {
  if (w <= 0 || h <= 0 || color.a === 0) return;
  const x0 = Math.max(0, Math.floor(cx - w / 2));
  const y0 = Math.max(0, Math.floor(cy - h / 2));
  const x1 = Math.min(width, Math.ceil(cx + w / 2));
  const y1 = Math.min(height, Math.ceil(cy + h / 2));
  const alpha = color.a / 255;
  const inv = 1 - alpha;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * width + x) * 4;
      pixels[idx + 0] = Math.round(pixels[idx + 0] * inv + color.r * alpha);
      pixels[idx + 1] = Math.round(pixels[idx + 1] * inv + color.g * alpha);
      pixels[idx + 2] = Math.round(pixels[idx + 2] * inv + color.b * alpha);
      pixels[idx + 3] = Math.min(
        255,
        Math.round(pixels[idx + 3] * inv + 255 * alpha),
      );
    }
  }
}

/**
 * Walk a `shapes` group, find an `el` or `rc` paired with an `fl`, and paint
 * it through `painter`. Doesn't recurse beyond one nesting level (templates
 * we ship don't nest groups deeper).
 */
function paintShapes(
  shapes: LottieShape[] | undefined,
  t: number,
  layerCenter: Vec2,
  layerScale: Vec2,
  layerOpacity: number,
  pixels: Buffer,
  width: number,
  height: number,
): void {
  if (!shapes) return;
  // Find the fill (color) first.
  let color: RGBA | null = null;
  let fillOpacity = 1;
  for (const s of shapes) {
    if (s.ty === "fl") {
      color = colorRGBA(sample(s.c, t, [0, 0, 0, 1]));
      fillOpacity = clamp01(toScalar(sample(s.o, t, [100]), 100) / 100);
    }
  }
  if (!color) return;
  color = { ...color, a: Math.round(color.a * fillOpacity * layerOpacity) };

  for (const s of shapes) {
    if (s.ty === "el") {
      const p = sample(s.p, t, [0, 0]);
      const sz = sample(s.s, t, [40, 40]);
      const cx = layerCenter.x + p[0] * layerScale.x;
      const cy = layerCenter.y + p[1] * layerScale.y;
      const rx = (sz[0] / 2) * layerScale.x;
      const ry = (sz[1] / 2) * layerScale.y;
      fillEllipse(pixels, width, height, cx, cy, rx, ry, color);
    } else if (s.ty === "rc") {
      const p = sample(s.p, t, [0, 0]);
      const sz = sample(s.s, t, [40, 40]);
      const cx = layerCenter.x + p[0] * layerScale.x;
      const cy = layerCenter.y + p[1] * layerScale.y;
      fillRect(
        pixels,
        width,
        height,
        cx,
        cy,
        sz[0] * layerScale.x,
        sz[1] * layerScale.y,
        color,
      );
    } else if (s.ty === "gr" && s.it) {
      paintShapes(s.it, t, layerCenter, layerScale, layerOpacity, pixels, width, height);
    }
  }
}

/**
 * Render a single frame of a (subset of) Lottie animation to a PNG buffer.
 * Returns transparent-on-white if the animation only uses unsupported features.
 */
export function renderFrameFallback(
  animation: unknown,
  frame: number,
  width: number,
  height: number,
): Buffer {
  const png = new PNG({ width, height });
  // Initialise to opaque white so simple shapes stand out for pixelmatch.
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i + 0] = 255;
    png.data[i + 1] = 255;
    png.data[i + 2] = 255;
    png.data[i + 3] = 255;
  }
  const pixels = png.data;

  const a = (animation ?? {}) as LottieAnimation;
  const srcW = typeof a.w === "number" && a.w > 0 ? a.w : width;
  const srcH = typeof a.h === "number" && a.h > 0 ? a.h : height;
  const sx = width / srcW;
  const sy = height / srcH;

  const layers = Array.isArray(a.layers) ? a.layers : [];
  for (const layer of layers) {
    if (!layer || layer.ty !== 4) continue; // only shape layers
    const ip = typeof layer.ip === "number" ? layer.ip : 0;
    const op = typeof layer.op === "number" ? layer.op : Number.POSITIVE_INFINITY;
    if (frame < ip || frame > op) continue;

    const ks = layer.ks ?? {};
    const pos = sample(ks.p, frame, [0, 0]);
    const scale = sample(ks.s, frame, [100, 100]);
    const op100 = toScalar(sample(ks.o, frame, [100]), 100);
    // Anchor is in source space, so factor it into where we centre.
    const anchor = sample(ks.a, frame, [0, 0]);

    const center: Vec2 = {
      x: (pos[0] - anchor[0]) * sx,
      y: (pos[1] - anchor[1]) * sy,
    };
    const lscale: Vec2 = {
      x: (scale[0] / 100) * sx,
      y: (scale[1] / 100) * sy,
    };
    const layerOpacity = clamp01(op100 / 100);

    paintShapes(layer.shapes, frame, center, lscale, layerOpacity, pixels, width, height);
  }

  return PNG.sync.write(png);
}
