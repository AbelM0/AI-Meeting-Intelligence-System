import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const standaloneOutput = process.env.VERCEL ? {} : { output: 'standalone' };

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel injects a Next build adapter that is incompatible with standalone
  // output in Next 16.3. Docker builds still need the standalone server bundle.
  ...standaloneOutput,
  outputFileTracingRoot: projectRoot,
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
  transpilePackages: ['@meeting-intelligence/schemas', '@meeting-intelligence/types'],
};

export default nextConfig;
