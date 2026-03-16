import React from 'react';
import Providers from './providers';
import 'react-toastify/dist/ReactToastify.css';
import '@/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#ec4899" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ABIFRESH" />
        <meta name="description" content="ABIFRESH & KIDDIES VENTURES Sales Management PWA" />
        <title>ABIFRESH & KIDDIES VENTURES</title>
        
        {/* Preload critical resources */}
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

        {/* Capture beforeinstallprompt at the earliest possible point */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log('[PWA Early] Initializing early install prompt capture...');
                window.__PWA_INSTALL_PROMPT__ = null;
                
                const handler = (e) => {
                  console.log('[PWA Early] ✅ beforeinstallprompt event captured at earliest point!');
                  e.preventDefault();
                  window.__PWA_INSTALL_PROMPT__ = e;
                  window.dispatchEvent(new CustomEvent('pwa-install-prompt-ready', { detail: e }));
                };
                
                window.addEventListener('beforeinstallprompt', handler);
                console.log('[PWA Early] Event listener attached');
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

