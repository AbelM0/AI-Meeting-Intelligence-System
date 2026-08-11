/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@meeting-intelligence/schemas', '@meeting-intelligence/types'],
};

export default nextConfig;
