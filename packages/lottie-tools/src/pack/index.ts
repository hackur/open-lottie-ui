/**
 * `.lottie` packer/unpacker — public entry point.
 *
 * Wire-up matches `package.json#exports["./pack"]` so callers reach the
 * module via `import { packDotLottie } from "@open-lottie/lottie-tools/pack"`.
 *
 * See ADR-005 (canonical export format) and `docs/research/04-dotlottie.md`
 * for the format spec.
 */

export { packDotLottie } from "./pack.ts";
export { unpackDotLottie } from "./unpack.ts";
export type {
  PackOptions,
  PackMeta,
  PackResult,
  UnpackResult,
  UnpackedAnimation,
} from "./types.ts";
