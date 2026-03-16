'use client';
import { Download, Zap, Lock, Wifi, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design3() {
  const currentDesign = 3;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-black text-white overflow-auto">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.15)_0%,transparent_100%)]" />
      </div>

      {/* Navigation Bar */}
      <div className="relative z-20 backdrop-blur-md bg-black/80 border-b border-emerald-500/30 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-8 h-8" />
            <span className="font-bold text-xl">Design 3/10</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-emerald-500/20 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm text-gray-300">Dark Neon</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-emerald-500/20 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Design Selector */}
      <nav className="relative z-19 backdrop-blur-md bg-black/80 border-b border-emerald-500/30 sticky top-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                d === currentDesign
                  ? 'bg-emerald-500 text-black'
                  : 'bg-gray-900/50 text-gray-300 hover:bg-gray-800/50'
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
              <h1 className="text-5xl md:text-6xl font-bold text-white">
                ABIFRESH<span className="text-emerald-400">.</span>
              </h1>
              <p className="text-lg text-gray-300">Download the next-gen app experience.</p>
              <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition">
                <Download className="w-5 h-5" /> Install Now
              </button>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { num: '1.2K', label: 'Installs' },
                  { num: '328', label: 'Today' },
                  { num: '5.6K', label: 'Week' },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-900/50 p-4 rounded-lg text-center border border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-400">{stat.num}</div>
                    <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded-3xl p-8 flex items-center justify-center aspect-square border border-emerald-500/20">
              <img src="/favicon.svg" alt="ABIFRESH" className="w-48 h-48" />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: <Zap />, title: 'Instant', desc: 'Zero latency' },
              { icon: <Lock />, title: 'Encrypted', desc: 'Military-grade' },
              { icon: <Wifi />, title: 'Offline', desc: 'Always available' },
            ].map((f, i) => (
              <div key={i} className="bg-gray-900/40 p-6 rounded-xl border border-emerald-500/30 hover:border-emerald-400/60 transition">
                <div className="text-emerald-400 mb-4 text-4xl">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={() => {
                localStorage.setItem('selectedDownloadDesign', '2');
                alert('Design 3 selected! Going to download page...');
                setTimeout(() => (window.location.href = '/download'), 500);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg transition"
            >
              ✓ Use This Design
            </button>
            <Link
              href="/download-previews"
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-lg transition text-center"
            >
              Back to Gallery
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
