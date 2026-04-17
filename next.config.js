/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/habit-duo',
  assetPrefix: '/habit-duo/',
  images: { unoptimized: true },
  trailingSlash: true,
};
module.exports = nextConfig;
