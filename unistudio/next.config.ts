import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static ships a native binary — keep it out of the Next.js bundle so
  // the binary path resolves correctly at runtime (Vercel Linux environment).
  serverExternalPackages: ['ffmpeg-static'],

  // Sello de build: inyecta el SHA del commit que Vercel está sirviendo en el
  // bundle del cliente, para que la usuaria VEA en pantalla qué versión está
  // viva y no haya más confusión de "¿ya deployó o estoy viendo el viejo?".
  env: {
    NEXT_PUBLIC_BUILD_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev').slice(0, 7),
  },

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
