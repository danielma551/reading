/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 确保正确的输出
  swcMinify: true,
  // 启用源映射以便调试
  productionBrowserSourceMaps: true,
  // 添加特定输出配置
  trailingSlash: true,
  // 确保资源链接正确
  assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  // 确保静态文件正确导出
  images: {
    unoptimized: true,
  }
}

module.exports = nextConfig 