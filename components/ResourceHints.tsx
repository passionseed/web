import Head from "next/head";

/**
 * Component to add resource hints for better image loading performance
 */
export function ResourceHints() {
  return (
    <Head>
      {/* DNS prefetch for external image domains */}
      <link rel="dns-prefetch" href="//backblazeb2.com" />
      <link rel="dns-prefetch" href="//supabase.co" />
      
      {/* Preconnect for critical image domains */}
      <link rel="preconnect" href="https://backblazeb2.com" crossOrigin="" />
      <link rel="preconnect" href="https://supabase.co" crossOrigin="" />
      
      {/* Image format support hints */}
      <meta name="supported-color-schemes" content="light dark" />
      
      {/* Performance hints */}
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      
      {/* Disable image toolbar on IE */}
      <meta httpEquiv="imagetoolbar" content="no" />
    </Head>
  );
}