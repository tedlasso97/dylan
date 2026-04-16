/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  /** Helps video seeking / playback from `public/content`. */
  async headers() {
    return [
      { source: "/content/albums/:path*", headers: [{ key: "Accept-Ranges", value: "bytes" }] },
      { source: "/content/videos/:path*", headers: [{ key: "Accept-Ranges", value: "bytes" }] },
      { source: "/content/images/:path*", headers: [{ key: "Accept-Ranges", value: "bytes" }] },
    ];
  },
  // Dev-only: avoid corrupted webpack chunk maps that surface as "Cannot find module './undefined'".
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    MIXPANEL_PROJECT_TOKEN: process.env.MIXPANEL_PROJECT_TOKEN,
    APP_ENV: process.env.APP_ENV,
    APP_NAME: process.env.APP_NAME
  }
}

module.exports = nextConfig
