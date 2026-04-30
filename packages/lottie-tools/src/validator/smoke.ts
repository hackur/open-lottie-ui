import type { SmokeResult } from "./types.ts";

/** Required top-level Bodymovin fields. Mirrors `required` in the vendored schema. */
const REQUIRED_TOP_LEVEL = ["v", "fr", "ip", "op", "w", "h", "layers"] as const;

/**
 * Cheap pre-filter: check that the input is an object and has all of the
 * commonly required Bodymovin top-level fields. Used as a fast path before
 * the full Ajv validator (e.g. for filtering Claude-generated junk early).
 *
 * Does NOT check field types or array shapes — that's the validator's job.
 */
export function smokeCheck(json: unknown): SmokeResult {
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    return { ok: false, missing: [...REQUIRED_TOP_LEVEL] };
  }
  const obj = json as Record<string, unknown>;
  const missing = REQUIRED_TOP_LEVEL.filter((k) => !(k in obj));
  return { ok: missing.length === 0, missing };
}
