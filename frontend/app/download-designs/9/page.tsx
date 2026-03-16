'use client';
import { Download, Zap, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design9() {
  const currentDesign = 9;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-gray-100 text-gray-800 overflow-auto">
      {/* Navigation Bar */}
      <div className="sticky top-0 bg-white border-b-2 border-gray-300 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-8 h-8" />
            <span className="font-bold text-xl text-gray-800">Design 9/10</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm text-gray-600">Neumorphism</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Design Selector */}
      <nav className="sticky top-16 bg-white border-b-2 border-gray-300 z-19 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-3xl text-sm font-medium whitespace-nowrap transition ${
                d === currentDesign
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
              Get ABIFRESH<span className="text-blue-600">.</span>
            </h1>
            <p className="text-lg text-gray-700">
              Experience the smooth, tactile design that feels amazing to use.
            </p>
            <button className="w-full bg-white text-blue-600 font-bold py-4 rounded-3xl flex items-center justify-center gap-3 border-2 border-gray-300 hover:border-gray-400 hover:shadow-2xl transition">
              <Download className="w-5 h-5" /> Download
            </button>
            <div className="grid grid-cols-3 gap-4">
              {[
                { num: '1.2K', label: 'Downloads' },
                { num: '328', label: 'Today' },
                { num: '5.6K', label: 'Week' },
              ].map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border-2 border-gray-200 shadow-lg text-center hover:shadow-xl transition">
                  <div className="text-2xl font-bold text-blue-600">{s.num}</div>
                  <div className="text-xs text-gray-600 mt-2">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white p-12 rounded-3xl border-2 border-gray-200 shadow-2xl flex items-center justify-center aspect-square">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-48 h-48" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: <Zap />, title: 'Smooth & Fast', desc: 'Butter smooth performance' },
            { icon: <Shield />, title: 'Safe & Secure', desc: 'Your data is protected' },
            { icon: <Download />, title: 'Easy Install', desc: 'Just one tap away' },
          ].map((f, i) => (
            <div key={i} className="bg-white p-8 rounded-3xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition text-center">
              <div className="text-blue-600 mb-4 text-4xl flex justify-center">{f.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="max-w-2xl mx-auto flex gap-4">
          <button
            onClick={() => {
              localStorage.setItem('selectedDownloadDesign', '8');
              alert('Design 9 selected! Going to download page...');
              setTimeout(() => (window.location.href = '/download'), 500);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition"
          >
            ✓ Use This Design
          </button>
          <Link
            href="/download-previews"
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-bold py-4 rounded-lg transition text-center"
          >
            Back to Gallery
          </Link>
        </div>
      </section>
    </div>
  );
}
