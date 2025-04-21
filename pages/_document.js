import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="zh-CN">
        <Head>
          <meta charSet="utf-8" />
          <meta name="description" content="优雅阅读应用 - 提供舒适的阅读体验，支持多种字体和背景色" />
          <meta name="theme-color" content="#f5f5f7" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="preload" href="/fonts/仓耳今楷05-W04-1.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument; 