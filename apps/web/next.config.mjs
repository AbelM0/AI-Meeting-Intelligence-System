/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  transpilePackages: ['@meeting-intelligence/schemas', '@meeting-intelligence/types'],
};

export default nextConfig;
