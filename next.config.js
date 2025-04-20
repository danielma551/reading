/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 确保正确的输出
  swcMinify: true,
  // 启用源映射以便调试
  productionBrowserSourceMaps: true
}

module.exports = nextConfig 