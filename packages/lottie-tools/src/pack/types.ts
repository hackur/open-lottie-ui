/**
 * Public types for the `.lottie` packer/unpacker.
 *
 * `.lottie` is a ZIP container described by ADR-005 and
 * `docs/research/04-dotlottie.md`. We use `@dotlottie/dotlottie-js` as the
 * reference implementation; these types are a thin, stable wrapper that hides
 * its concrete classes from callers.
 */

/** Optional human-friendly metadata baked into the `.lottie` manifest. */
export interface PackMeta {
  /** Display title of the animation/pack. */
  title?: string;
  /** Author / attribution string (e.g. "Nora <nora@notice-u.com>"). */
  author?: string;
  /**
   * SPDX license id (e.g. `CC0-1.0`, `MIT`). Stored in the manifest's
   * `custom.license` field — the dotLottie spec has no first-class license
   * slot, so we stash it under `custom`.
   */
  license?: string;
  /** Long-form description shown in browsers / players. */
  description?: string;
  /**
   * Tag-like keywords. The dotLottie manifest stores these as a single
   * comma-separated string; we accept an array for ergonomics and join on
   * the way in.
   */
  keywords?: string[];
}

/** Input to {@link packDotLottie}. */
export interface PackOptions {
  /**
   * Animation id used as the in-archive identifier (and as the manifest's
   * `activeAnimationId`). Must be a non-empty string; kebab-case is
   * conventional but not enforced.
   */
  id: string;
  /** The Lottie JSON document (parsed). */
  animation: unknown;
  /** Optional manifest metadata. */
  meta?: PackMeta;
}

/** Result of {@link packDotLottie}. */
export interface PackResult {
  /** ZIP bytes of the `.lottie` archive. */
  bytes: Uint8Array;
  /**
   * Echo of the manifest the packer asked dotlottie-js to write. Useful for
   * UI "what's inside?" panes and for round-trip tests.
   */
  manifest: unknown;
}

/** A single animation pulled out of a `.lottie` by {@link unpackDotLottie}. */
export interface UnpackedAnimation {
  /** Manifest id of the animation. */
  id: string;
  /** The parsed Lottie JSON document. */
  json: unknown;
}

/** Result of {@link unpackDotLottie}. */
export interface UnpackResult {
  animations: UnpackedAnimation[];
  manifest: unknown;
}
