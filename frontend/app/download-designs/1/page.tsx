'use client';
import { Download, Smartphone, Zap, Shield, Users, Wifi, Lock, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design1() {
  const designs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const currentDesign: number = 1;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-auto">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      {/* Navigation Bar */}
      <div className="relative z-20 backdrop-blur-md bg-slate-900/70 border-b border-slate-700/50 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">AF</span>
            </div>
            <span className="font-bold text-xl">Design 1/10</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-slate-800 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm text-slate-400">Modern Gradient</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-slate-800 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      <nav className="relative z-20 sticky top-16 backdrop-blur-md bg-slate-900/70 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {designs.map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                d === currentDesign
                  ? 'bg-pink-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Design {d}
            </Link>
          ))}
        </div>
      </nav>

      <div className="relative z-10">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Install <span className="bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">ABIFRESH</span>
              </h1>
              <p className="text-xl text-slate-300">Your powerful app, now in your pocket.</p>
              <button className="w-full bg-gradient-to-r from-pink-500 to-blue-500 hover:shadow-2xl hover:shadow-pink-500/50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3">
                <Download className="w-5 h-5" /> Download & Install
              </button>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 text-center border border-slate-700/50">
                  <div className="text-2xl font-bold text-pink-400">1.2K</div>
                  <div className="text-xs text-slate-400 mt-1">Downloads</div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 text-center border border-slate-700/50">
                  <div className="text-2xl font-bold text-blue-400">328</div>
                  <div className="text-xs text-slate-400 mt-1">Today</div>
                </div>
                <div className="bg-slate-800/50 backdrop-blur rounded-lg p-4 text-center border border-slate-700/50">
                  <div className="text-2xl font-bold text-purple-400">5.6K</div>
                  <div className="text-xs text-slate-400 mt-1">Last 7 Days</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-pink-500/20 to-blue-500/20 backdrop-blur rounded-3xl p-8 border border-pink-500/20">
                <div className="aspect-square bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 flex items-center justify-center">
                  <img src="/favicon.svg" alt="ABIFRESH" className="w-40 h-40 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-4xl font-bold mb-12 text-center">Why Download?</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: <Zap />, title: 'Lightning Fast', desc: 'Instant loading' },
              { icon: <Wifi />, title: 'Works Offline', desc: 'Full functionality' },
              { icon: <Lock />, title: 'Secure & Private', desc: 'Military-grade' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-xl p-6">
                <div className="text-pink-400 mb-4 text-4xl">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={() => {
                localStorage.setItem('selectedDownloadDesign', '0');
                alert('Design 1 selected! Going to download page...');
                setTimeout(() => (window.location.href = '/download'), 500);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg transition"
            >
              ✓ Use This Design
            </button>
            <Link
              href="/download-previews"
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-lg transition text-center"
            >
              Back to Gallery
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
