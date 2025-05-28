import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

// 确定当前环境的URL
// 使用 NEXTAUTH_URL 环境变量，如果未设置则根据环境自动检测
const baseUrl = process.env.NEXTAUTH_URL || 
  (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
    ? 'https://reading-self.vercel.app' 
    : 'http://localhost:3000');

export default NextAuth({
  // 设置站点URL
  site: baseUrl,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 保存访问令牌和刷新令牌
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      // 将访问令牌发送到客户端
      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  // 设置自定义页面
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});
