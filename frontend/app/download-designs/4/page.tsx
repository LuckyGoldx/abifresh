'use client';
import { Download, Zap, Shield, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Design4() {
  const currentDesign: number = 4;
  const prevDesign = currentDesign === 1 ? 10 : currentDesign - 1;
  const nextDesign = currentDesign === 10 ? 1 : currentDesign + 1;

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 to-white text-gray-900 overflow-auto">
      {/* Navigation Bar */}
      <div className="sticky top-0 bg-white border-b border-blue-100 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/download-previews" className="flex items-center gap-3 hover:opacity-80 transition">
            <img src="/favicon.svg" alt="ABIFRESH" className="w-8 h-8" />
            <span className="font-bold text-xl text-blue-600">Design 4/10</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href={`/download-designs/${prevDesign}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <span className="text-sm text-gray-600">Corporate</span>
            <Link href={`/download-designs/${nextDesign}`} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Design Selector */}
      <nav className="sticky top-16 bg-white border-b border-blue-100 z-19 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
            <Link
              key={d}
              href={`/download-designs/${d}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                d === currentDesign
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Design {d}
            </Link>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h1 className="text-5xl md:text-6xl font-bold text-blue-900 mb-4">
                  Enterprise-Grade App
                </h1>
                <p className="text-lg text-gray-700">
                  Download ABIFRESH for professional business management. Trusted by thousands of companies.
                </p>
              </div>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-3 transition shadow-lg">
                <Download className="w-5 h-5" /> Download & Install
              </button>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { num: '1.2K', label: 'Downloads' },
                  { num: '328', label: 'Active Today' },
                  { num: '5.6K', label: '7-Day Active' },
                ].map((s, i) => (
                  <div key={i} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{s.num}</div>
                    <div className="text-xs text-gray-600 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-12 flex items-center justify-center aspect-square border-2 border-blue-200">
              <img src="/favicon.svg" alt="ABIFRESH" className="w-48 h-48" />
            </div>
          </div>
        </section>

        <section className="py-16 bg-white rounded-2xl px-8 my-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-blue-900">Why Choose ABIFRESH?</h2>
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {[
              { icon: <Zap />, title: 'Performance', desc: 'Lightning fast' },
              { icon: <Shield />, title: 'Security', desc: 'Enterprise-grade' },
              { icon: <Users />, title: 'Support', desc: '24/7 available' },
              { icon: <Download />, title: 'Easy Install', desc: 'One-click setup' },
            ].map((f, i) => (
              <div key={i} className="text-center">
                <div className="text-blue-600 mb-3 text-4xl flex justify-center">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="max-w-2xl mx-auto flex gap-4">
            <button
              onClick={() => {
                localStorage.setItem('selectedDownloadDesign', '3');
                alert('Design 4 selected! Going to download page...');
                setTimeout(() => (window.location.href = '/download'), 500);
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg transition"
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
    </div>
  );
}
