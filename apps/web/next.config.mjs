/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  transpilePackages: ['@quran-project/ui', '@quran-project/shared-ts']
};

export default nextConfig;
