/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 基本构建优化
  swcMinify: true,
  // 移除可能导致问题的配置
  trailingSlash: false,
  // 移除自定义assetPrefix（在Vercel上不需要）
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  // 图像优化设置
  images: {
    unoptimized: false, // 让Vercel优化图像
  },
  // 确保正确处理API路由
  async rewrites() {
    return [];
  }
}

module.exports = nextConfig 