'use client';

import { useEffect, useState, useRef } from 'react';
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
  ChevronDown
} from 'lucide-react';

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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [stats, setStats] = useState<DownloadStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // Fetch download statistics
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/download/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Handle BeforeInstallPrompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDownloadClick = async () => {
    if (isInstalled) {
      alert('ABIFRESH is already installed on your device!');
      return;
    }

    try {
      setIsLoading(true);

      // Track download
      const trackingData = {
        platform: navigator.userAgent,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };

      try {
        const response = await fetch('/api/download/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trackingData),
        });
        
        if (response.ok) {
          console.log('Download tracked successfully');
          // Refresh stats after tracking
          setTimeout(fetchStats, 500);
        }
      } catch (error) {
        console.error('Tracking error:', error);
      }

      // Show install prompt
      if (deferredPrompt) {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setDownloadSuccess(true);
          setShowInstallPrompt(false);
          // Redirect to homepage after 2 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } else {
        // Fallback: Show instructions
        alert('To install ABIFRESH:\n\n1. Open the app menu (three dots)\n2. Select "Install app"\n3. Or use "Add to Home Screen"');
      }
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsLoading(false);
    }
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
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 backdrop-blur-md bg-slate-900/70 border-b border-slate-700/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">AF</span>
            </div>
            <span className="font-bold text-xl">ABIFRESH</span>
          </div>
          <div className="text-sm text-slate-400">Download the App</div>
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
                <p className="text-xl text-slate-300">
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
                  <p className="text-sm text-slate-400 text-center">
                    ✓ Free • No ads • Always secure
                  </p>
                )}
              </div>

              {/* Stats preview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 text-center border border-slate-700/50">
                  <div className="text-2xl font-bold text-pink-400">{stats?.totalDownloads.toLocaleString() || '—'}</div>
                  <div className="text-xs text-slate-400 mt-1">Total Downloads</div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 text-center border border-slate-700/50">
                  <div className="text-2xl font-bold text-blue-400">{stats?.todayDownloads || '—'}</div>
                  <div className="text-xs text-slate-400 mt-1">Today</div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 text-center border border-slate-700/50">
                  <div className="text-2xl font-bold text-purple-400">{stats?.recentDownloads || '—'}</div>
                  <div className="text-xs text-slate-400 mt-1">Last 7 Days</div>
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
                className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-xl p-6 hover:border-pink-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 group cursor-pointer"
              >
                <div className="text-pink-400 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
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
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all"
              >
                <div className="text-4xl mb-4">{platform.icon}</div>
                <h3 className="text-xl font-bold mb-4">{platform.name}</h3>
                <ol className="space-y-2">
                  {platform.steps.map((step, j) => (
                    <li key={j} className="text-sm text-slate-300 flex gap-2">
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
        <section ref={statsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-r from-pink-500/10 to-blue-500/10 rounded-3xl border border-slate-700/30 my-8">
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
                className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-xl overflow-hidden hover:border-pink-500/50 transition-all"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                >
                  <span className="font-bold text-left">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-pink-400 transition-transform ${
                      expandedFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expandedFaq === i && (
                  <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700/50 text-slate-300">
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
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
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
