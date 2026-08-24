/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // This is still supported to bypass the draft/page.tsx error
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sleepercdn.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  transpilePackages: ["firebase-admin"],
};

module.exports = nextConfig;
