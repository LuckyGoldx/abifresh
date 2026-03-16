'use client';
import { Download, Cpu, Zap, Shield, Wifi, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design7() {
  const currentDesign = 7;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-black text-white overflow-auto">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.15)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(139,92,246,0.15)_0%,transparent_50%)]" />
      </div>

      {/* Navigation Bar */}
      <div className="relative z-20 backdrop-blur-xl bg-black/50 border-b border-blue-500/20 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-3 hover:opacity-80 transition">
            <Cpu className="w-6 h-6 text-cyan-400" />
            <span className="font-mono font-bold text-xl">Design 7/10</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-cyan-500/20 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm font-mono">Tech Forward</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-cyan-500/20 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Design Selector */}
      <nav className="relative z-19 backdrop-blur-xl bg-black/50 border-b border-blue-500/20 sticky top-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-lg text-sm font-mono whitespace-nowrap transition ${
                d === currentDesign
                  ? 'bg-cyan-500 text-black'
                  : 'bg-slate-900/50 text-gray-300 hover:bg-slate-800/50'
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
              <div className="space-y-4">
                <div className="text-cyan-400 font-mono text-sm">// Advanced Technology</div>
                <h1 className="text-5xl md:text-6xl font-bold font-mono">
                  ABIFRESH<span className="text-cyan-400">_V2.0</span>
                </h1>
                <p className="text-slate-400 font-mono">Next-generation PWA technology</p>
              </div>
              <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition font-mono">
                <Download className="w-5 h-5" /> INSTALL NOW
              </button>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { code: '1.2K', label: 'Installs' },
                  { code: '328', label: 'Today' },
                  { code: '5.6K', label: 'Weekly' },
                ].map((s, i) => (
                  <div key={i} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 font-mono text-center">
                    <div className="text-2xl font-bold text-cyan-400">{s.code}</div>
                    <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-8 border border-slate-700/50 flex items-center justify-center aspect-square">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full" />
                <img src="/favicon.svg" alt="ABIFRESH" className="w-48 h-48 relative z-10" />
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: <Zap />, label: '< 50ms Latency' },
              { icon: <Shield />, label: '256-bit Encryption' },
              { icon: <Wifi />, label: 'Offline-First' },
              { icon: <Cpu />, label: 'AI-Powered' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 text-center hover:border-cyan-500/50 transition">
                <div className="text-cyan-400 mb-3 text-3xl flex justify-center">{f.icon}</div>
                <p className="text-sm font-mono text-slate-300">{f.label}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={() => {
                localStorage.setItem('selectedDownloadDesign', '6');
                alert('Design 7 selected! Going to download page...');
                setTimeout(() => (window.location.href = '/download'), 500);
              }}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-4 rounded-lg transition"
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
