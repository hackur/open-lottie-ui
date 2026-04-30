/**
 * Reads a `.lottie` ZIP archive into its component animations + manifest.
 *
 * Uses the static `DotLottie.fromArrayBuffer` documented in the v1.6+ Node
 * entry point of `@dotlottie/dotlottie-js`.
 */

import type { UnpackResult, UnpackedAnimation } from "./types.ts";

export async function unpackDotLottie(buffer: Uint8Array | ArrayBuffer): Promise<UnpackResult> {
  const ab =
    buffer instanceof Uint8Array
      ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
      : buffer;

  const mod = (await import(/* @vite-ignore */ "@dotlottie/dotlottie-js")) as unknown as {
    DotLottie: { fromArrayBuffer: (ab: ArrayBuffer) => Promise<DotLottieInstance> };
  };
  if (typeof mod.DotLottie?.fromArrayBuffer !== "function") {
    throw new Error(
      "unpackDotLottie: @dotlottie/dotlottie-js does not expose DotLottie.fromArrayBuffer.",
    );
  }

  const dl = await mod.DotLottie.fromArrayBuffer(ab as ArrayBuffer);
  const out: UnpackedAnimation[] = [];
  const animations = dl.animations ?? [];
  for (const anim of animations) {
    let json: unknown = null;
    try {
      json = await anim.toJSON();
    } catch {
      json = null;
    }
    out.push({ id: anim.id, json });
  }
  return { animations: out, manifest: dl.manifest ?? null };
}

interface DotLottieAnimation {
  id: string;
  toJSON(): Promise<unknown>;
}

interface DotLottieInstance {
  manifest?: unknown;
  animations?: DotLottieAnimation[];
}
