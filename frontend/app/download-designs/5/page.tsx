'use client';
import { Download, Rocket, Heart, Sparkles, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design5() {
  const currentDesign = 5;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 text-white overflow-auto">
      {/* Navigation Bar */}
      <div className="sticky top-0 backdrop-blur-md bg-white/10 border-b border-white/20 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-8 h-8" />
            <span className="font-bold text-xl">Design 5/10</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm">Playful</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-white/10 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Design Selector */}
      <nav className="sticky top-16 backdrop-blur-md bg-white/10 border-b border-white/20 z-19">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                d === currentDesign
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
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
            <div>
              <h1 className="text-5xl md:text-6xl font-black drop-shadow-lg">
                Get ABIFRESH Now! 🎉
              </h1>
              <p className="text-xl mt-4 text-white/90">
                Amazing features. Beautiful design. Pure fun.
              </p>
            </div>
            <button className="w-full bg-white text-purple-600 font-bold py-4 rounded-full flex items-center justify-center gap-3 text-lg transition hover:scale-105 hover:shadow-2xl">
              <Rocket className="w-6 h-6" /> Download & Play
            </button>
            <div className="grid grid-cols-3 gap-4">
              {[
                { emoji: '🚀', num: '1.2K', label: 'Downloads' },
                { emoji: '⭐', num: '328', label: 'Today' },
                { emoji: '🎉', num: '5.6K', label: 'Week' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/20 backdrop-blur p-4 rounded-2xl text-center border border-white/30">
                  <div className="text-3xl mb-1">{stat.emoji}</div>
                  <div className="text-2xl font-bold">{stat.num}</div>
                  <div className="text-xs text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-3xl p-8 border border-white/30 flex items-center justify-center aspect-square animate-bounce">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-48 h-48" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: <Heart />, title: 'Love It', desc: 'Users adore our app' },
            { icon: <Sparkles />, title: 'Gorgeous UI', desc: 'Beautiful design' },
            { icon: <Zap />, title: 'Super Fast', desc: 'Lightning quick' },
          ].map((f, i) => (
            <div key={i} className="bg-white/20 backdrop-blur p-6 rounded-2xl border border-white/30 text-center">
              <div className="mb-3 text-4xl flex justify-center">{f.icon}</div>
              <h3 className="text-xl font-bold mb-2">{f.title}</h3>
              <p className="text-white/90">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="max-w-2xl mx-auto flex gap-4">
          <button
            onClick={() => {
              localStorage.setItem('selectedDownloadDesign', '4');
              alert('Design 5 selected! Going to download page...');
              setTimeout(() => (window.location.href = '/download'), 500);
            }}
            className="flex-1 bg-white text-purple-600 font-bold py-4 rounded-full transition hover:scale-105"
          >
            ✓ Use This Design
          </button>
          <Link
            href="/download-previews"
            className="flex-1 bg-white/30 hover:bg-white/40 text-white font-bold py-4 rounded-full transition text-center"
          >
            Back to Gallery
          </Link>
        </div>
      </section>
    </div>
  );
}
