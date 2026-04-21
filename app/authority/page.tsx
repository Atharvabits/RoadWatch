"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Shield, ArrowUpDown, CheckCircle, Wrench, AlertTriangle } from "lucide-react";
import { RoadAnomaly, MOCK_CREWS } from "@/lib/types";

type SortKey = "intensity" | "hits" | "timestamp";

function StatusBadge({ status }: { status: RoadAnomaly["status"] }) {
  const map: Record<string, string> = {
    reported: "bg-[#6b7280]/20 text-[#6b7280] border-[#6b7280]/30",
    verified: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    repair_assigned: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    fixed: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  const labels: Record<string, string> = {
    reported: "Reported",
    verified: "Verified",
    repair_assigned: "In Progress",
    fixed: "Fixed",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${map[status ?? "reported"]}`}>
      {labels[status ?? "reported"]}
    </span>
  );
}

function IntensityBar({ value }: { value: number }) {
  const color = value >= 0.8 ? "bg-red-500" : value >= 0.5 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-[#2a2a3a] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className="text-xs text-[#6b7280] font-mono">{value.toFixed(1)}</span>
    </div>
  );
}

export default function AuthorityPage() {
  const [rows, setRows] = useState<RoadAnomaly[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("intensity");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pothole" | "speedbreaker">("all");

  // Subscribe to SSE — same feed as dashboard
  useEffect(() => {
    const es = new EventSource("/api/anomalies");

    es.addEventListener("seed", (e) => {
      const data: RoadAnomaly[] = JSON.parse(e.data);
      setRows(data.filter((a) => a.type !== "breakdown").sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0)));
    });

    es.addEventListener("anomaly", (e) => {
      const a: RoadAnomaly = JSON.parse(e.data);
      if (a.type === "breakdown") return;
      setRows((prev) => [a, ...prev]);
    });

    return () => es.close();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      const next = sortDir === "desc" ? "asc" : "desc";
      setSortDir(next);
      setRows((prev) => [...prev].sort((a, b) => next === "desc" ? compare(b, a, key) : compare(a, b, key)));
    } else {
      setSortKey(key);
      setSortDir("desc");
      setRows((prev) => [...prev].sort((a, b) => compare(b, a, key)));
    }
  }

  function compare(a: RoadAnomaly, b: RoadAnomaly, key: SortKey) {
    if (key === "intensity") return (a.intensity ?? 0) - (b.intensity ?? 0);
    if (key === "hits") return (a.hits ?? 0) - (b.hits ?? 0);
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  }

  function dispatch(id: string) {
    setDispatching(id);
    setTimeout(() => {
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: "repair_assigned" } : r));
      setDispatching(null);
    }, 1200);
  }

  const displayed = rows.filter((r) => filter === "all" || r.type === filter);
  const total = rows.length;
  const inProgress = rows.filter((r) => r.status === "repair_assigned").length;
  const critical = rows.filter((r) => r.intensity >= 0.8).length;
  const verified = rows.filter((r) => r.status === "verified").length;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
      <header className="border-b border-[#2a2a3a] px-4 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1 text-[#6b7280] hover:text-[#e2e8f0] transition-colors text-sm">
          <ChevronLeft size={14} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-blue-400" />
          <span className="font-semibold text-sm">BBMP Authority Dashboard</span>
        </div>
        <div className="ml-auto text-xs text-[#6b7280]">Bengaluru Municipal Corporation</div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats bento */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Reports", value: total, icon: <AlertTriangle size={18} />, color: "text-blue-400" },
            { label: "In Progress", value: inProgress, icon: <Wrench size={18} />, color: "text-amber-400" },
            { label: "Critical Spots", value: critical, icon: "⚡", color: "text-red-400" },
            { label: "Verified", value: verified, icon: <CheckCircle size={18} />, color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-4 flex items-center gap-3">
              <div className={s.color}>{s.icon}</div>
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[#6b7280] text-xs">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Crews */}
        <div className="bg-[#111118] border border-[#2a2a3a] rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-[#6b7280]">REPAIR CREWS</h3>
          <div className="flex gap-3 flex-wrap">
            {MOCK_CREWS.map((c) => (
              <div key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${c.available ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-[#2a2a3a] bg-[#2a2a3a]/30 text-[#6b7280]"}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${c.available ? "bg-green-400" : "bg-[#6b7280]"}`} />
                {c.name}
                <span className="text-xs opacity-70">{c.available ? "Available" : "Deployed"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter + Table */}
        <div className="bg-[#111118] border border-[#2a2a3a] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2a3a] flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold">Road Anomaly Reports</h3>
            <div className="ml-auto flex gap-2">
              {(["all", "pothole", "speedbreaker"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all ${filter === f ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-[#2a2a3a] text-[#6b7280] hover:border-[#3a3a4a]"}`}
                >
                  {f === "all" ? "All" : f === "pothole" ? "🕳️ Potholes" : "⚠️ Speed Breakers"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a3a] text-[#6b7280] text-xs">
                  <th className="text-left px-4 py-3">Location</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-[#e2e8f0]" onClick={() => toggleSort("intensity")}>
                    <span className="flex items-center gap-1">Severity <ArrowUpDown size={10} /></span>
                  </th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-[#e2e8f0]" onClick={() => toggleSort("hits")}>
                    <span className="flex items-center gap-1">Hits <ArrowUpDown size={10} /></span>
                  </th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 cursor-pointer hover:text-[#e2e8f0]" onClick={() => toggleSort("timestamp")}>
                    <span className="flex items-center gap-1">Reported <ArrowUpDown size={10} /></span>
                  </th>
                  <th className="text-left px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#6b7280] text-sm">
                      No reports yet. Start a trip or submit a report from the Report page.
                    </td>
                  </tr>
                )}
                {displayed.map((row, i) => (
                  <tr key={row.id} className={`border-b border-[#1a1a24] hover:bg-[#1a1a24] transition-colors ${i % 2 === 0 ? "" : "bg-[#0d0d15]"}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#e2e8f0]">{row.location}</div>
                      <div className="text-xs text-[#6b7280] font-mono">{row.lat.toFixed(4)}, {row.lng.toFixed(4)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-[#6b7280]">
                        {row.type === "pothole" ? "🕳️" : "⚠️"} {row.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <IntensityBar value={row.intensity} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-[#e2e8f0]">{row.hits ?? 0}</span>
                      <span className="text-[#6b7280] text-xs ml-1">reports</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs">
                      {new Date(row.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "repair_assigned" || row.status === "fixed" ? (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <CheckCircle size={12} /> Dispatched
                        </span>
                      ) : (
                        <button
                          onClick={() => dispatch(row.id)}
                          disabled={dispatching === row.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs hover:bg-blue-500/30 transition-all disabled:opacity-50"
                        >
                          <Wrench size={10} />
                          {dispatching === row.id ? "Dispatching..." : "Dispatch"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
