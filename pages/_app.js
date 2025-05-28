import React from 'react';
import Head from 'next/head';
import { SessionProvider } from 'next-auth/react';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return (
    <SessionProvider session={pageProps.session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>优雅阅读应用</title>
      </Head>
      <div suppressHydrationWarning>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}

export default MyApp; 