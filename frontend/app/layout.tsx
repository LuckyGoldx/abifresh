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

        {/* PWA Install Prompt Handler */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log('[PWA Early] Initializing PWA install system...');
                window.__PWA_INSTALL_PROMPT__ = null;
                window.__PWA_INSTALL_READY__ = false;
                
                // Capture native beforeinstallprompt if available
                const nativeHandler = (e) => {
                  console.log('[PWA Early] ✅ beforeinstallprompt event captured!');
                  e.preventDefault();
                  window.__PWA_INSTALL_PROMPT__ = e;
                  window.__PWA_INSTALL_READY__ = true;
                  window.dispatchEvent(new CustomEvent('pwa-install-prompt-ready', { detail: e }));
                };
                
                // Listen for service worker ready and dispatch custom install event
                const swHandler = () => {
                  console.log('[PWA Early] ✅ Service worker is controlling - PWA ready for dev!');
                  window.__PWA_INSTALL_READY__ = true;
                  window.dispatchEvent(new CustomEvent('pwa-ready'));
                };
                
                window.addEventListener('beforeinstallprompt', nativeHandler);
                navigator.serviceWorker?.controller && swHandler();
                navigator.serviceWorker?.addEventListener('controllerchange', swHandler);
                
                console.log('[PWA Early] PWA system initialized');
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

