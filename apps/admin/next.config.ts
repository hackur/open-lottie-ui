import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

// Optional native deps from `sharp` (pulled in via @dotlottie/dotlottie-js → sharp-phash).
// We don't need them — the app only ships `sharp` to satisfy the import graph and never
// runs through the libvips pre-built path. Mark them external so webpack doesn't try to
// resolve them and emit warnings on every dev compile.
const SHARP_OPTIONAL = [
  "@img/sharp-libvips-dev/include",
  "@img/sharp-libvips-dev/cplusplus",
  "@img/sharp-wasm32/versions",
];

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  serverExternalPackages: [
    "lottie-web",
    "@lottiefiles/dotlottie-web",
    "@dotlottie/dotlottie-js",
    "sharp",
    "sharp-phash",
  ],
  webpack: (cfg: WebpackConfig) => {
    cfg.externals = cfg.externals || [];
    if (Array.isArray(cfg.externals)) {
      cfg.externals.push(...SHARP_OPTIONAL.map((m) => ({ [m]: `commonjs ${m}` })));
    }
    return cfg;
  },
};

export default config;
