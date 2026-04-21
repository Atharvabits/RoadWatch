"use client";
import Link from "next/link";
import { MapPin, AlertTriangle, Shield, Activity, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0] flex flex-col">
      <nav className="border-b border-[#2a2a3a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <MapPin size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">RoadWatch</span>
          <span className="text-[#6b7280] text-sm ml-1">Bengaluru</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 live-indicator" />
          <span className="text-xs text-[#6b7280]">LIVE</span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-sm text-blue-400 mb-8">
          <Zap size={12} />
          Hackathon Build — Bengaluru Smart City Initiative
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
          Roadside Intelligence<br />
          <span className="text-blue-400">for Bengaluru</span>
        </h1>

        <p className="text-[#6b7280] text-lg max-w-xl mb-12">
          Crowdsourced road health monitoring. Real-time pothole detection via smartphone sensors.
          Emergency assistance at one tap.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-12 w-full max-w-lg">
          {[
            { label: "Potholes Mapped", value: "2,847", color: "text-blue-400" },
            { label: "Active Repairs", value: "14", color: "text-amber-400" },
            { label: "Lives Assisted", value: "312", color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[#6b7280] text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <Link href="/dashboard" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Activity size={16} /> Live Dashboard
          </Link>
          <Link href="/report" className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <AlertTriangle size={16} /> Report / Assist
          </Link>
          <Link href="/authority" className="flex-1 bg-[#1a1a24] hover:bg-[#2a2a3a] border border-[#2a2a3a] text-[#e2e8f0] font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <Shield size={16} /> Authority
          </Link>
        </div>
      </main>

      <footer className="border-t border-[#2a2a3a] px-6 py-4 text-center text-[#6b7280] text-xs">
        Built for Smart Bengaluru Hackathon 2024 · Powered by Next.js + Go (Golang)
      </footer>
    </div>
  );
}
