/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 禁用严格模式以减少重复渲染
  // 基本构建优化
  swcMinify: true,
  // 移除可能导致问题的配置
  trailingSlash: false,
  // 移除自定义assetPrefix（在Vercel上不需要）
  // assetPrefix: process.env.NODE_ENV === 'production' ? '/' : '',
  // 图像优化设置
  images: {
    unoptimized: false, // 让Vercel优化图像
    domains: ['vercel.com', 'lh3.googleusercontent.com'], // 允许从其他域名加载图像
  },
  // 开启热重载功能
  webpackDevMiddleware: config => {
    config.watchOptions = {
      poll: 1000, // 检查文件变化的间隔（毫秒）
      aggregateTimeout: 300, // 延迟重新构建的时间（毫秒）
      ignored: ['node_modules']
    }
    return config
  },
  // 确保正确处理API路由
  async rewrites() {
    return [];
  },
  // 增加性能优化配置
  compiler: {
    // 移除console.log语句（生产环境）
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 开启增量静态再生成
  experimental: {
    scrollRestoration: true,
  },
  // 解决水合错误
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 配置客户端渲染
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig 