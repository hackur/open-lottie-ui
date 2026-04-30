import { createHash } from "node:crypto";

/**
 * Recursively canonicalize a JSON-shaped value:
 *   - object keys sorted lexicographically
 *   - arrays preserve order (order is semantic in Lottie — layers, keyframes)
 *   - primitives unchanged
 *
 * We rebuild objects with sorted keys rather than using the
 * `JSON.stringify(value, replacer)` form so that the result is itself a stable
 * value (handy for diffing in tests).
 */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = canonicalize(obj[key]);
    }
    return out;
  }
  return value;
}

/**
 * Stable content hash of any JSON-shaped value. Returns `"sha256:" + hex`.
 *
 * Two animations that differ only in property order produce the same hash —
 * that's the point. Whitespace doesn't matter because we re-stringify the
 * canonical form ourselves.
 */
export function contentHash(json: unknown): string {
  const canonical = JSON.stringify(canonicalize(json));
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  return `sha256:${digest}`;
}
