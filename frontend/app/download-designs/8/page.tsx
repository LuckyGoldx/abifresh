'use client';
import { Download, Zap, Radio, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design8() {
  const currentDesign: number = 8;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-red-300 via-yellow-200 to-pink-300 text-gray-900 overflow-auto">
      {/* Navigation Bar */}
      <div className="sticky top-0 backdrop-blur-md bg-white/80 border-b-4 border-red-400 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-3 hover:opacity-80 transition">
            <Radio className="w-6 h-6 text-red-500 animate-spin" />
            <span className="font-black text-xl text-red-600">Design 8/10</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-yellow-300 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm font-bold text-red-600">Retro</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-yellow-300 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Design Selector */}
      <nav className="sticky top-16 backdrop-blur-md bg-white/80 border-b-4 border-red-400 z-19">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition border-2 ${
                d === currentDesign
                  ? 'bg-red-500 text-white border-red-600'
                  : 'bg-yellow-300 text-gray-900 border-red-400 hover:bg-red-300'
              }`}
            >
              Design {d}
            </Link>
          ))}
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="text-red-500 font-black text-5xl md:text-6xl drop-shadow-lg">
                RETRO COOL
              </div>
              <p className="text-lg text-gray-800 font-bold">Download ABIFRESH - The 80s Way!</p>
            </div>
            <button className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-full flex items-center justify-center gap-3 text-lg border-4 border-yellow-400 transition hover:scale-105">
              <Download className="w-6 h-6" /> DOWNLOAD
            </button>
            <div className="grid grid-cols-3 gap-4">
              {[
                { num: '1.2K', label: 'Downloads', bg: 'bg-red-400' },
                { num: '328', label: 'Today', bg: 'bg-yellow-400' },
                { num: '5.6K', label: 'Week', bg: 'bg-pink-400' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} p-4 rounded-xl border-4 border-gray-900 text-center`}>
                  <div className="text-2xl font-black text-gray-900">{s.num}</div>
                  <div className="text-xs font-bold text-gray-800">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-yellow-300 rounded-3xl p-8 border-4 border-red-500 flex items-center justify-center aspect-square">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-48 h-48" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-blue-300 p-8 rounded-3xl border-4 border-gray-900">
          <h2 className="text-4xl font-black text-gray-900 mb-8 text-center">WHY IT ROCKS</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { icon: '⚡', title: 'FAST AF', desc: 'Speed & Style' },
              { icon: '🔒', title: 'SECURE', desc: 'Stay Safe' },
              { icon: '☀️', title: 'GROOVY', desc: 'Pure Vibes' },
            ].map((f, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border-4 border-gray-900 text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-black text-gray-900">{f.title}</h3>
                <p className="text-gray-700 font-bold">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={() => {
                localStorage.setItem('selectedDownloadDesign', '7');
                alert('Design 8 selected! Going to download page...');
                setTimeout(() => (window.location.href = '/download'), 500);
              }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-lg border-2 border-red-700 transition"
            >
              ✓ Use This Design
            </button>
            <Link
              href="/download-previews"
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black py-4 rounded-lg border-2 border-gray-900 transition text-center"
            >
              Back to Gallery
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
