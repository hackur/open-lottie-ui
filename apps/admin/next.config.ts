import type { NextConfig } from "next";

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
};

export default config;
