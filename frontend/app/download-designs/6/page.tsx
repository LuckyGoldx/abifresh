'use client';
import { Download, Crown, Shield, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design6() {
  const currentDesign = 6;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-white overflow-auto">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-700/20 rounded-full blur-3xl" />
      </div>

      {/* Navigation Bar */}
      <div className="relative z-20 backdrop-blur-md bg-slate-900/70 border-b border-amber-600/30 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-8 h-8" />
            <span className="font-bold text-xl">Design 6/10</span>
            <Crown className="w-5 h-5 text-amber-500 ml-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-amber-600/20 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm text-amber-200">Luxury</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-amber-600/20 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Design Selector */}
      <nav className="relative z-19 backdrop-blur-md bg-slate-900/70 border-b border-amber-600/30 sticky top-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                d === currentDesign
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
              }`}
            >
              Design {d}
            </Link>
          ))}
        </div>
      </nav>

      <div className="relative z-10">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                Experience Luxury
              </h1>
              <p className="text-lg text-slate-300">
                Premium app experience with gold-tier features and exclusive benefits.
              </p>
              <button className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition">
                <Download className="w-5 h-5" /> Get ABIFRESH Premium
              </button>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: '👑', num: '1.2K', label: 'Premium Users' },
                  { icon: '✨', num: '328', label: 'Today' },
                  { icon: '🏆', num: '5.6K', label: 'Exclusive' },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-amber-600/30 text-center">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="text-xl font-bold text-amber-400">{s.num}</div>
                    <div className="text-xs text-slate-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl p-8 border border-amber-600/30 flex items-center justify-center aspect-square">
              <img src="/favicon.svg" alt="ABIFRESH" className="w-48 h-48" />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: <Crown />, title: 'Premium Features', desc: 'Exclusive access' },
              { icon: <Shield />, title: 'Gold Security', desc: 'Fully protected' },
              { icon: <Sparkles />, title: 'VIP Support', desc: 'Priority service' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-800/40 p-6 rounded-xl border border-amber-600/20 hover:border-amber-600/50 transition">
                <div className="text-amber-400 mb-4 text-4xl">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={() => {
                localStorage.setItem('selectedDownloadDesign', '5');
                alert('Design 6 selected! Going to download page...');
                setTimeout(() => (window.location.href = '/download'), 500);
              }}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-lg transition"
            >
              ✓ Use This Design
            </button>
            <Link
              href="/download-previews"
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-lg transition text-center"
            >
              Back to Gallery
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
