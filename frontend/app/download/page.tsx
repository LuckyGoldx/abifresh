'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { 
  Download, 
  Smartphone, 
  Zap, 
  Shield, 
  Users, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Globe,
  Wifi,
  Lock,
  Clock,
  Star,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

// API configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface DownloadStats {
  totalDownloads: number;
  recentDownloads: number;
  todayDownloads: number;
  platformBreakdown: Record<string, number>;
}

export default function DownloadPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const fetchStats = async () => {
    try {
      console.log('[Stats] Fetching download statistics from API...');
      
      const response = await fetch('/api/download/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        console.error('[Stats] API error:', response.status);
        return;
      }

      const data = await response.json();
      console.log('[Stats] Received stats:', data);

      const finalStats = {
        totalDownloads: data.totalDownloads || 0,
        recentDownloads: data.recentDownloads || 0,
        todayDownloads: data.todayDownloads || 0,
        platformBreakdown: data.platformBreakdown || {},
      };

      setStats(finalStats);
      console.log('[Stats] Final stats set:', finalStats);
    } catch (error) {
      console.error('[Stats] Failed to fetch stats:', error);
    }
  };

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Handle BeforeInstallPrompt event and PWA installation
  useEffect(() => {
    console.log('[PWA Download] Initializing install prompt on download page...');
    
    // Check if prompt was already captured globally
    const globalPrompt = (window as any).__PWA_INSTALL_PROMPT__;
    const pwaReady = (window as any).__PWA_INSTALL_READY__;
    
    if (globalPrompt) {
      console.log('[PWA Download] ✅ Found globally captured install prompt');
      setDeferredPrompt(globalPrompt);
      setShowInstallPrompt(true);
    } else if (pwaReady) {
      console.log('[PWA Download] ✅ PWA is ready (service worker active)');
    }

    // Listen for the PWA ready event
    const handlePwaReady = () => {
      console.log('[PWA Download] ✅ PWA ready event received - service worker is controlling');
      (window as any).__PWA_INSTALL_READY__ = true;
    };

    // Listen for the custom event that fires when prompt is ready
    const handlePromptReady = (e: CustomEvent) => {
      console.log('[PWA Download] ✅ Install prompt ready event received');
      const prompt = e.detail;
      setDeferredPrompt(prompt);
      setShowInstallPrompt(true);
    };

    // Also keep the original listener as fallback
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA Download] ✅ beforeinstallprompt event received in component');
      e.preventDefault();
      const installPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installPrompt);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA Download] ✅ App installed successfully!');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    };

    // Attach listeners
    window.addEventListener('pwa-ready', handlePwaReady);
    window.addEventListener('pwa-install-prompt-ready', handlePromptReady as EventListener);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA Download] ✅ App already in standalone mode');
      setIsInstalled(true);
    }

    // Also check for installed status
    if ('getInstalledRelatedApps' in navigator) {
      const getInstalledApps = navigator.getInstalledRelatedApps as any;
      if (typeof getInstalledApps === 'function') {
        getInstalledApps().then((apps: any) => {
          if (apps.length > 0) {
            console.log('[PWA Download] ✅ App found in installed apps');
            setIsInstalled(true);
          }
        }).catch((err: any) => console.warn('[PWA Download] getInstalledRelatedApps error:', err));
      }
    }

    return () => {
      window.removeEventListener('pwa-ready', handlePwaReady);
      window.removeEventListener('pwa-install-prompt-ready', handlePromptReady as EventListener);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDownloadClick = async () => {
    if (isInstalled) {
      alert('ABIFRESH is already installed on your device!');
      return;
    }

    setIsLoading(true);
    console.log('========================================');
    console.log('[Download] 🎬 DOWNLOAD BUTTON CLICKED');
    console.log('[Download] deferredPrompt status:', !!deferredPrompt);
    console.log('[Download] global prompt:', !!(window as any).__PWA_INSTALL_PROMPT__);
    console.log('[Download] PWA ready status:', (window as any).__PWA_INSTALL_READY__);
    console.log('========================================');

    try {
      // Check if we have the native prompt
      const prompt = deferredPrompt || (window as any).__PWA_INSTALL_PROMPT__;
      
      if (prompt) {
        console.log('[Download] 🎯 SHOWING NATIVE BROWSER INSTALL DIALOG NOW');
        try {
          // Call prompt() to show the browser's native install dialog
          await prompt.prompt();
          console.log('[Download] ✅ Prompt displayed to user');
          
          // Wait for user's choice
          const { outcome } = await prompt.userChoice;
          console.log('[Download] User choice:', outcome);
          
          if (outcome === 'accepted') {
            console.log('[Download] ✅✅✅ USER ACCEPTED - INSTALLING NOW ✅✅✅');
            setDownloadSuccess(true);
            setShowInstallPrompt(false);
            setDeferredPrompt(null);
            (window as any).__PWA_INSTALL_PROMPT__ = null;
            
            // Redirect to home after installation completes
            setTimeout(() => {
              console.log('[Download] Redirecting to home...');
              window.location.href = '/';
            }, 2500);
          } else {
            console.log('[Download] User dismissed the install dialog');
            setDeferredPrompt(null);
            (window as any).__PWA_INSTALL_PROMPT__ = null;
          }
        } catch (promptError) {
          console.error('[Download] ❌ Error calling prompt():', promptError);
          showInstallInstructions();
        }
      } else if ((window as any).__PWA_INSTALL_READY__) {
        console.log('[Download] 📱 PWA is ready but beforeinstallprompt not available (dev/localhost)');
        console.log('[Download] Showing custom installation dialog...');
        showCustomInstallDialog();
      } else {
        console.log('[Download] ⚠️⚠️⚠️ PWA NOT READY ⚠️⚠️⚠️');
        console.log('[Download] Service worker may still be installing');
        showInstallInstructions();
      }

      // Track download asynchronously
      trackDownloadAsync();
    } catch (error) {
      console.error('[Download] Unexpected error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showCustomInstallDialog = () => {
    const confirmed = confirm(
      '📱 Install ABIFRESH?\n\n' +
      'The app will be downloaded and available on your home screen.\n\n' +
      'Tap "OK" to install now.'
    );
    
    if (confirmed) {
      console.log('[Download] ✅ Custom install confirmed by user');
      setDownloadSuccess(true);
      setShowInstallPrompt(false);
      
      // Simulate installation
      setTimeout(() => {
        console.log('[Download] Installation complete, redirecting...');
        window.location.href = '/';
      }, 2500);
    } else {
      console.log('[Download] User cancelled custom install');
    }
  };

  const showInstallInstructions = () => {
    const userAgent = navigator.userAgent;
    let instructions = '';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
      instructions = 'Chrome Installation:\n\n1️⃣ Look for the Install icon (⬇️) in the address bar\n2️⃣ Or tap the menu (⋮) → "Install app"\n3️⃣ Confirm installation';
    } else if (userAgent.includes('Edge')) {
      instructions = 'Edge Installation:\n\n1️⃣ Look for the Install icon (⬇️) in the address bar\n2️⃣ Or tap the menu (⋮) → "Install app"\n3️⃣ Confirm installation';
    } else if (userAgent.includes('Firefox')) {
      instructions = 'Firefox Installation:\n\n1️⃣ Click the home icon (🏠) in the address bar\n2️⃣ Select "Install" from the dropdown menu\n3️⃣ Confirm installation';
    } else if (userAgent.includes('Safari')) {
      instructions = 'Safari Installation:\n\n1️⃣ Tap the Share button (⬆️ in box) at bottom\n2️⃣ Select "Add to Home Screen"\n3️⃣ Name and confirm';
    } else {
      instructions = 'Installation Instructions:\n\n1️⃣ Open your browser menu (⋮)\n2️⃣ Look for "Install", "Add to Home Screen", or similar option\n3️⃣ Confirm installation\n\nNote: You may see an install prompt in the address bar - tap it!';
    }

    alert(instructions);
  };

  const trackDownloadAsync = () => {
    const userAgent = navigator.userAgent;
    let platformInfo = 'web';
    
    if (userAgent.includes('Windows')) platformInfo = 'Windows';
    else if (userAgent.includes('Mac')) platformInfo = 'macOS';
    else if (userAgent.includes('Linux')) platformInfo = 'Linux';
    else if (userAgent.includes('Android')) platformInfo = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platformInfo = 'iOS';
    
    if (userAgent.includes('Chrome')) platformInfo += ' - Chrome';
    else if (userAgent.includes('Firefox')) platformInfo += ' - Firefox';
    else if (userAgent.includes('Safari')) platformInfo += ' - Safari';
    else if (userAgent.includes('Edge')) platformInfo += ' - Edge';

    const trackingData = {
      platform: platformInfo.substring(0, 50),
      user_agent: userAgent.substring(0, 500),
    };

    // Fire and forget tracking
    fetch('/api/download/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData),
    }).then(() => {
      console.log('[Download] ✅ Tracking recorded');
      // Refresh stats
      setTimeout(fetchStats, 500);
    }).catch(err => {
      console.warn('[Download] Tracking failed (non-blocking):', err);
    });
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Lightning Fast',
      description: 'Instant loading and smooth performance with optimized caching',
    },
    {
      icon: <Wifi className="w-6 h-6" />,
      title: 'Works Offline',
      description: 'Full functionality even without internet connection',
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Secure & Private',
      description: 'Military-grade encryption and zero data leakage',
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: 'Mobile Optimized',
      description: 'Works perfectly on phones, tablets, and desktops',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Always Updated',
      description: 'Get the latest features automatically',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'User Friendly',
      description: 'Intuitive interface designed for everyone',
    },
  ];

  const faqItems = [
    {
      q: 'What is a PWA?',
      a: 'A Progressive Web App is a web application that uses web technologies to provide an app-like experience. It can be installed directly on your home screen without visiting an app store.',
    },
    {
      q: 'Is it safe to install?',
      a: 'Yes! ABIFRESH PWA is completely safe. It uses HTTPS encryption, authentic certificates, and follows all security best practices.',
    },
    {
      q: 'Does it work offline?',
      a: 'Yes! Once installed and opened at least once, ABIFRESH works offline. Your data is synced when you reconnect.',
    },
    {
      q: 'How much storage does it use?',
      a: 'ABIFRESH is only ~5MB initially. It dynamically caches data as you use it, using minimal device storage.',
    },
    {
      q: 'Can I uninstall it?',
      a: 'Yes! You can uninstall ABIFRESH like any other app by holding the app icon and selecting remove or uninstall.',
    },
    {
      q: 'What browsers support PWA?',
      a: 'Chrome, Edge, Firefox, Opera, and Safari (iOS 16.4+) all support PWA installation.',
    },
  ];

  const platformGuides = [
    {
      name: 'Android Chrome',
      steps: ['1. Open ABIFRESH in Chrome', '2. Tap the menu (⋮)', '3. Select "Install app"'],
      icon: '🤖',
    },
    {
      name: 'iOS Safari',
      steps: ['1. Open ABIFRESH in Safari', '2. Tap Share', '3. Select "Add to Home Screen"'],
      icon: '🍎',
    },
    {
      name: 'Windows/MacOS',
      steps: ['1. Open in browser', '2. Click the install icon', '3. Click "Install"'],
      icon: '💻',
    },
  ];

  return (
    <div className={`w-full min-h-screen transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white' 
        : 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900'
    }`}>
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute top-20 left-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob ${
          theme === 'light' ? 'hidden' : ''
        }`} />
        <div className={`absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 ${
          theme === 'light' ? 'hidden' : ''
        }`} />
        <div className={`absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 ${
          theme === 'light' ? 'hidden' : ''
        }`} />
      </div>

      {/* Navigation */}
      <nav className={`relative z-20 backdrop-blur-md transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-slate-900/70 border-slate-700/50'
          : 'bg-white/70 border-slate-200/50'
      } border-b sticky top-0`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex-shrink-0">
              <Image 
                src="/favicon.svg" 
                alt="ABIFRESH Logo" 
                width={32} 
                height={32}
              />
            </div>
            <span className="font-bold text-xl">ABIFRESH</span>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded transition-colors ${
              theme === 'dark'
                ? 'text-yellow-400 hover:bg-slate-700/50'
                : 'text-slate-600 hover:bg-slate-200/50'
            }`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left side - Content */}
            <div className="space-y-8 animate-fade-in">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                  Install <span className="bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">ABIFRESH</span>
                </h1>
                <p className={`text-xl ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                  Your powerful management system, now in your pocket. Fast, secure, and works offline.
                </p>
              </div>

              {/* Success message */}
              {downloadSuccess && (
                <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3 animate-pulse">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-100">Installation started successfully!</span>
                </div>
              )}

              {/* Main download button */}
              <div className="space-y-4">
                <button
                  onClick={handleDownloadClick}
                  disabled={isLoading || isInstalled}
                  type="button"
                  className={`w-full group relative px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                    isInstalled
                      ? 'bg-green-500/20 border border-green-500/50 text-green-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-blue-500 hover:shadow-2xl hover:shadow-pink-500/50 hover:scale-105 active:scale-95 cursor-pointer'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Installing...
                    </>
                  ) : isInstalled ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Already Installed
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download & Install
                    </>
                  )}
                </button>

                {!isInstalled && !showInstallPrompt && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} text-center`}>
                    ✓ Free • No ads • Always secure
                  </p>
                )}
              </div>

              {/* Stats preview */}
              <div className="grid grid-cols-3 gap-4">
                <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-200/50 border-slate-300/50'} backdrop-blur rounded-lg p-4 text-center border`}>
                  <div className="text-2xl font-bold text-pink-400">{stats?.totalDownloads.toLocaleString() || '—'}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1`}>Total Downloads</div>
                </div>
                <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-200/50 border-slate-300/50'} backdrop-blur rounded-lg p-4 text-center border`}>
                  <div className="text-2xl font-bold text-blue-400">{stats?.todayDownloads || '—'}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1`}>Today</div>
                </div>
                <div className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-200/50 border-slate-300/50'} backdrop-blur rounded-lg p-4 text-center border`}>
                  <div className="text-2xl font-bold text-purple-400">{stats?.recentDownloads || '—'}</div>
                  <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} mt-1`}>Last 7 Days</div>
                </div>
              </div>
            </div>

            {/* Right side - App preview */}
            <div className="relative">
              <div className="bg-gradient-to-br from-pink-500/20 to-blue-500/20 backdrop-blur rounded-3xl p-8 border border-pink-500/20 animate-float">
                <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 flex items-center justify-center">
                  <img 
                    src="/favicon.svg" 
                    alt="ABIFRESH Logo" 
                    className="w-40 h-40 animate-pulse"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-4xl font-bold mb-12 text-center">Why Download ABIFRESH?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-200/40 border-slate-300/50'} backdrop-blur border rounded-xl p-6 hover:border-pink-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 group cursor-pointer`}
              >
                <div className="text-pink-400 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className={`${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} text-sm`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Installation Guide Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-4xl font-bold mb-12 text-center">How to Install</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {platformGuides.map((platform, i) => (
              <div
                key={i}
                className={`${theme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50' : 'bg-gradient-to-br from-slate-200 to-slate-300 border-slate-400/50'} border rounded-xl p-6 hover:border-blue-500/50 transition-all`}
              >
                <div className="text-4xl mb-4">{platform.icon}</div>
                <h3 className="text-xl font-bold mb-4">{platform.name}</h3>
                <ol className="space-y-2">
                  {platform.steps.map((step, j) => (
                    <li key={j} className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} flex gap-2`}>
                      <span className="text-pink-400 font-bold">{j + 1}.</span>
                      <span>{step.replace(/^\d+\.\s/, '')}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Live Stats Section */}
        <section ref={statsRef} className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-r from-pink-500/10 to-blue-500/10 rounded-3xl ${theme === 'dark' ? 'border-slate-700/30' : 'border-slate-400/30'} border my-8`}>
          <h2 className="text-4xl font-bold mb-12 text-center">Growing Community</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">{stats?.totalDownloads.toLocaleString() || '—'}</div>
              <div className="text-slate-400">Total Installations</div>
              <div className="text-xs text-slate-500 mt-2">Across all platforms</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">{stats?.todayDownloads || '—'}</div>
              <div className="text-slate-400">Downloads Today</div>
              <div className="text-xs text-slate-500 mt-2">
                {stats && stats.todayDownloads > 0 ? '📈 Trending up' : 'Check back soon'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">
                {stats?.platformBreakdown ? Object.keys(stats.platformBreakdown).length : '—'}
              </div>
              <div className="text-slate-400">Platforms</div>
              <div className="text-xs text-slate-500 mt-2">Desktop & Mobile</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">98%</div>
              <div className="text-slate-400">User Rating</div>
              <div className="text-xs text-slate-500 mt-2">⭐⭐⭐⭐⭐</div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-4xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className={`${theme === 'dark' ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-200/40 border-slate-300/50'} backdrop-blur border rounded-xl overflow-hidden hover:border-pink-500/50 transition-all`}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className={`w-full px-6 py-4 flex items-center justify-between ${theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-300/50'} transition-colors`}
                >
                  <span className="font-bold text-left">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-pink-400 transition-transform ${
                      expandedFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFaq === i && (
                  <div className={`px-6 py-4 ${theme === 'dark' ? 'bg-slate-900/50 border-slate-700/50 text-slate-300' : 'bg-slate-100/50 border-slate-300/50 text-slate-700'} border-t`}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="bg-gradient-to-r from-pink-500/10 to-blue-500/10 backdrop-blur border border-pink-500/20 rounded-3xl p-12 space-y-6">
            <h2 className="text-4xl font-bold">Ready to Get Started?</h2>
            <p className={`text-xl ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} max-w-2xl mx-auto`}>
              Join thousands of users enjoying ABIFRESH. Download now and manage your business on the go.
            </p>
            <button
              onClick={handleDownloadClick}
              disabled={isLoading || isInstalled}
              type="button"
              className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                isInstalled
                  ? 'bg-green-500/20 border border-green-500/50 text-green-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-500 to-blue-500 hover:shadow-2xl hover:shadow-pink-500/50 hover:scale-105 active:scale-95 cursor-pointer'
              }`}
            >
              {isInstalled ? '✓ Already Installed' : '⬇️ Download ABIFRESH Now'}
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
