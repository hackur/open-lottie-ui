/**
 * Builds a `.lottie` (ZIP) archive from a Lottie JSON + metadata using
 * `@dotlottie/dotlottie-js` v1.6+.
 *
 * The current API takes options in the constructor:
 *   new DotLottie({ author, description, keywords, customData })
 *     .addAnimation({ id, data })
 *     .toArrayBuffer() => Promise<ArrayBuffer>
 *
 * The package stamps its own `generator` field; we cannot override without
 * post-processing the ZIP, which isn't worth it for M1.
 */

import type { PackOptions, PackResult } from "./types.ts";

export async function packDotLottie(opts: PackOptions): Promise<PackResult> {
  if (!opts || typeof opts !== "object") {
    throw new Error("packDotLottie: opts is required.");
  }
  if (typeof opts.id !== "string" || opts.id.length === 0) {
    throw new Error("packDotLottie: opts.id must be a non-empty string.");
  }
  if (opts.animation === null || typeof opts.animation !== "object") {
    throw new Error(
      "packDotLottie: opts.animation must be a parsed Lottie JSON object.",
    );
  }

  const mod = (await import(/* @vite-ignore */ "@dotlottie/dotlottie-js")) as {
    DotLottie: DotLottieCtor;
  };
  const { DotLottie } = mod;
  if (typeof DotLottie !== "function") {
    throw new Error(
      "packDotLottie: @dotlottie/dotlottie-js does not export DotLottie.",
    );
  }

  const meta = opts.meta ?? {};
  const ctorOpts: DotLottieOptions = {};
  if (meta.author != null) ctorOpts.author = meta.author;
  if (meta.description != null) ctorOpts.description = meta.description;
  if (meta.keywords && meta.keywords.length > 0) ctorOpts.keywords = meta.keywords.join(", ");
  const custom = buildCustomData(meta);
  if (custom) ctorOpts.customData = custom;

  const dotLottie = new DotLottie(ctorOpts);
  dotLottie.addAnimation({
    id: opts.id,
    data: opts.animation as Record<string, unknown>,
  });

  const arrayBuffer = await dotLottie.toArrayBuffer();
  const bytes = new Uint8Array(arrayBuffer.byteLength);
  bytes.set(new Uint8Array(arrayBuffer));

  return { bytes, manifest: dotLottie.manifest ?? null };
}

function buildCustomData(meta: NonNullable<PackOptions["meta"]>): Record<string, unknown> | undefined {
  const custom: Record<string, unknown> = {};
  if (meta.title != null) custom.title = meta.title;
  if (meta.license != null) custom.license = meta.license;
  return Object.keys(custom).length > 0 ? custom : undefined;
}

interface DotLottieInstance {
  manifest?: unknown;
  addAnimation(opts: {
    id: string;
    data?: Record<string, unknown>;
    url?: string;
    loop?: boolean;
    autoplay?: boolean;
  }): DotLottieInstance;
  toArrayBuffer(): Promise<ArrayBuffer>;
}

interface DotLottieOptions {
  author?: string;
  description?: string;
  keywords?: string;
  customData?: Record<string, unknown>;
}

type DotLottieCtor = new (opts?: DotLottieOptions) => DotLottieInstance;
