import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: projectRoot,
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  transpilePackages: ['@meeting-intelligence/schemas', '@meeting-intelligence/types'],
};

export default nextConfig;
