"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, AlertTriangle, Activity, Zap, ChevronLeft, Wifi } from "lucide-react";
import { RoadAnomaly, MOCK_ANOMALIES } from "@/lib/types";
import { createMockWebSocket } from "@/lib/mock-websocket";

const RoadMap = dynamic(() => import("@/components/RoadMap"), { ssr: false });

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function intensityBadge(v: number) {
  if (v >= 0.8) return "bg-red-500/20 text-red-400 border-red-500/30";
  if (v >= 0.5) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-green-500/20 text-green-400 border-green-500/30";
}

function intensityLabel(v: number) {
  if (v >= 0.8) return "CRITICAL";
  if (v >= 0.5) return "MODERATE";
  return "LOW";
}

const typeIcon: Record<string, string> = {
  pothole: "🕳️",
  speedbreaker: "⚠️",
  breakdown: "🚨",
};

export default function Dashboard() {
  const [anomalies, setAnomalies] = useState<RoadAnomaly[]>(MOCK_ANOMALIES);
  const [feed, setFeed] = useState<RoadAnomaly[]>([...MOCK_ANOMALIES].slice(0, 8).reverse());
  const [wsConnected, setWsConnected] = useState(false);

  const handleNewAnomaly = useCallback((a: RoadAnomaly) => {
    setAnomalies((prev) => [...prev, a]);
    setFeed((prev) => [a, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    setWsConnected(true);
    const cleanup = createMockWebSocket(handleNewAnomaly);
    return () => { cleanup(); setWsConnected(false); };
  }, [handleNewAnomaly]);

  const potholes = anomalies.filter((a) => a.type === "pothole").length;
  const breakdowns = anomalies.filter((a) => a.type === "breakdown").length;
  const critical = anomalies.filter((a) => a.intensity >= 0.8).length;
  const repairs = anomalies.filter((a) => a.status === "repair_assigned").length;

  return (
    <div className="h-screen bg-[#0a0a0f] text-[#e2e8f0] flex flex-col overflow-hidden">
      {/* Topbar */}
      <header className="border-b border-[#2a2a3a] px-4 py-3 flex items-center gap-4 shrink-0">
        <Link href="/" className="flex items-center gap-1 text-[#6b7280] hover:text-[#e2e8f0] transition-colors text-sm">
          <ChevronLeft size={14} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
            <MapPin size={12} className="text-white" />
          </div>
          <span className="font-semibold text-sm">RoadWatch — Live Dashboard</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? "text-green-400" : "text-red-400"}`}>
            <Wifi size={12} />
            {wsConnected ? "WS Connected" : "Disconnected"}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-indicator" />
            LIVE · {anomalies.length} events
          </div>
        </div>
      </header>

      {/* Bento stats */}
      <div className="px-4 pt-3 pb-2 grid grid-cols-4 gap-3 shrink-0">
        {[
          { label: "Total Potholes", value: potholes, icon: "🕳️", color: "text-blue-400" },
          { label: "Active Breakdowns", value: breakdowns, icon: "🚨", color: "text-red-400" },
          { label: "Critical Spots", value: critical, icon: "⚡", color: "text-amber-400" },
          { label: "Repairs Dispatched", value: repairs, icon: "🔧", color: "text-green-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-3 flex items-center gap-3">
            <span className="text-xl">{s.icon}</span>
            <div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[#6b7280] text-xs">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-0 overflow-hidden px-4 pb-4 gap-3">
        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-[#2a2a3a] relative">
          <RoadMap anomalies={anomalies} />
          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 bg-[#111118]/90 border border-[#2a2a3a] rounded-lg p-3 text-xs space-y-1.5 backdrop-blur">
            <div className="text-[#6b7280] font-medium mb-1">LEGEND</div>
            {[
              { color: "bg-red-500", label: "Active Breakdown" },
              { color: "bg-amber-500", label: "Speed Breaker" },
              { color: "bg-blue-500", label: "Pothole (low)" },
              { color: "bg-red-600", label: "Pothole (critical)" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-[#e2e8f0]">{l.label}</span>
              </div>
            ))}
          </div>
          <div className="absolute top-4 left-4 bg-[#111118]/90 border border-[#2a2a3a] rounded-lg px-3 py-1.5 text-xs text-blue-400 flex items-center gap-1.5 backdrop-blur">
            <Activity size={10} />
            Heatmap Layer Active
          </div>
        </div>

        {/* Live feed sidebar */}
        <div className="w-72 shrink-0 flex flex-col bg-[#111118] border border-[#2a2a3a] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a3a] flex items-center gap-2">
            <Zap size={14} className="text-blue-400" />
            <span className="font-semibold text-sm">Live Anomaly Feed</span>
            <span className="ml-auto text-xs text-[#6b7280] bg-[#2a2a3a] px-2 py-0.5 rounded-full">{feed.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[#2a2a3a]">
            {feed.map((a) => (
              <div key={a.id} className="px-4 py-3 hover:bg-[#1a1a24] transition-colors anomaly-item">
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">{typeIcon[a.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${intensityBadge(a.intensity)}`}>
                        {intensityLabel(a.intensity)}
                      </span>
                      <span className="text-xs text-[#6b7280] capitalize">{a.type}</span>
                    </div>
                    <p className="text-xs text-[#e2e8f0] font-medium truncate">
                      {a.type === "breakdown" ? "⚡ Breakdown reported" : a.type === "speedbreaker" ? "Unmarked speed breaker" : "Sharp dip detected"} near <span className="text-blue-400">{a.location}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-[#6b7280]">{timeAgo(a.timestamp)}</span>
                      <span className="text-[10px] text-[#6b7280]">·</span>
                      <span className="text-[10px] text-[#6b7280]">Intensity: {a.intensity.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
