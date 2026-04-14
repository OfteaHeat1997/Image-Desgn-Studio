import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static ships a native binary — keep it out of the Next.js bundle so
  // the binary path resolves correctly at runtime (Vercel Linux environment).
  serverExternalPackages: ['ffmpeg-static'],

  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "replicate.delivery",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "fal.media",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "v3.fal.media",
        pathname: "/**",
      },
    ],
  },

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},

  // Webpack fallback for @imgly/background-removal WASM (when using --webpack)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
