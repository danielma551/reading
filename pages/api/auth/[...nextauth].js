import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export default NextAuth({
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
});
