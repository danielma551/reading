import React from 'react';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>优雅阅读应用</title>
      </Head>
      <div suppressHydrationWarning>
        <Component {...pageProps} />
      </div>
    </>
  );
}

export default MyApp; 