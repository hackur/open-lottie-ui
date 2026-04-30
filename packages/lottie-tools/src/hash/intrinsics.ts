/**
 * Shape mirrors `intrinsic` in `library/<id>/meta.json`
 * (see docs/architecture/data-model.md).
 */
export type Intrinsics = {
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  layer_count: number;
  size_bytes: number;
};

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Pull the cheap intrinsic fields out of a parsed Lottie animation. These are
 * the fields surfaced in library listings and used to detect duplicates +
 * obviously-broken outputs.
 *
 * `size_bytes` is the byte length of the un-pretty JSON encoding of the input
 * (UTF-8). It's an approximation of on-disk size for the canonical
 * `animation.json`; exact byte counts depend on whitespace in the source file
 * but are within a few percent for realistic Lottie data.
 */
export function intrinsics(json: unknown): Intrinsics {
  const obj = (json ?? {}) as Record<string, unknown>;
  const layers = Array.isArray(obj.layers) ? (obj.layers as unknown[]) : [];
  const serialized = JSON.stringify(json);
  return {
    fr: num(obj.fr),
    ip: num(obj.ip),
    op: num(obj.op),
    w: num(obj.w),
    h: num(obj.h),
    layer_count: layers.length,
    size_bytes: Buffer.byteLength(serialized ?? "", "utf8"),
  };
}
