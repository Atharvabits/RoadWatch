"use client";
import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, PhoneCall, MapPin, Camera, Navigation,
  Play, Square, Activity, AlertTriangle, Smartphone, Monitor,
} from "lucide-react";
import { useDeviceMotion, ANOMALY_THRESHOLD_MS2 } from "@/lib/useDeviceMotion";

export default function ReportPage() {
  const [tripActive, setTripActive] = useState(false);
  const { readings, status: motionStatus } = useDeviceMotion(tripActive);
  const [sosPressed, setSosPressed] = useState(false);
  const [form, setForm] = useState({ type: "pothole", description: "", gps: "", lat: 0, lng: 0 });
  const [hasGps, setHasGps] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [gpsLoading, setGpsLoading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);

  const latest = readings[readings.length - 1];
  const chartData = readings.slice(-50);
  const maxZ = Math.max(...chartData.map((d) => Math.abs(d.zAccel)), 1);
  const anomalyFlash = !!latest?.anomalyDetected;

  // Auto-report anomaly from sensor to backend while trip is active
  const lastAutoReport = useRef(0);
  if (latest?.anomalyDetected && hasGps) {
    const now = Date.now();
    if (now - lastAutoReport.current > 3000) {
      lastAutoReport.current = now;
      fetch("/api/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: form.lat + (Math.random() - 0.5) * 0.001,
          lng: form.lng + (Math.random() - 0.5) * 0.001,
          type: "pothole",
          intensity: Math.min(1, Math.abs(latest.zAccel) / 20),
          location: form.gps || "In-trip detection",
        }),
      }).catch(() => {});
    }
  }

  function detectGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({
          ...f,
          lat: latitude,
          lng: longitude,
          gps: `${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`,
        }));
        setHasGps(true);
        setGpsLoading(false);
      },
      () => {
        setForm((f) => ({ ...f, lat: 12.9784, lng: 77.6408, gps: "12.97840° N, 77.64080° E (approx)" }));
        setHasGps(true);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasGps) {
      detectGPS();
      return;
    }
    setSubmitState("submitting");
    try {
      const res = await fetch("/api/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: form.lat,
          lng: form.lng,
          type: form.type,
          intensity: 0.6,
          location: form.gps || "User reported",
          description: form.description,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitState("success");
      setForm((f) => ({ ...f, description: "" }));
      setTimeout(() => setSubmitState("idle"), 3000);
    } catch {
      setSubmitState("error");
      setTimeout(() => setSubmitState("idle"), 3000);
    }
  }

  const statusLabel: Record<typeof motionStatus, string> = {
    idle: "Idle",
    requesting: "Requesting permission…",
    denied: "Permission denied",
    mock: "Simulated (desktop)",
    live: "Live sensor",
  };

  const statusColor: Record<typeof motionStatus, string> = {
    idle: "text-[#6b7280]",
    requesting: "text-amber-400",
    denied: "text-red-400",
    mock: "text-amber-400",
    live: "text-green-400",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e2e8f0]">
      <header className="border-b border-[#2a2a3a] px-4 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1 text-[#6b7280] hover:text-[#e2e8f0] transition-colors text-sm">
          <ChevronLeft size={14} /> Back
        </Link>
        <span className="font-semibold text-sm">Report & Assistance</span>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* SOS */}
        <div className={`rounded-2xl border-2 transition-all p-6 text-center ${sosPressed ? "border-red-400 bg-red-500/10" : "border-red-500/40 bg-[#111118]"}`}>
          <p className="text-[#6b7280] text-sm mb-4">Vehicle breakdown or road emergency?</p>
          <button
            onPointerDown={() => setSosPressed(true)}
            onPointerUp={() => setSosPressed(false)}
            onPointerLeave={() => setSosPressed(false)}
            onClick={() => {
              if (!form.lat) detectGPS();
              fetch("/api/anomalies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lat: form.lat || 12.9784,
                  lng: form.lng || 77.6408,
                  type: "breakdown",
                  intensity: 1.0,
                  location: form.gps || "Emergency SOS",
                }),
              }).catch(() => {});
            }}
            className={`w-32 h-32 rounded-full font-bold text-lg transition-all flex flex-col items-center justify-center gap-2 mx-auto border-4 ${sosPressed ? "bg-red-600 border-red-400 scale-95" : "bg-red-500 border-red-600 hover:bg-red-600"} text-white shadow-lg shadow-red-500/30`}
          >
            <PhoneCall size={28} />
            <span className="text-sm">EMERGENCY</span>
          </button>
          <p className="text-[#6b7280] text-xs mt-4">Tap to broadcast breakdown to BBMP + live dashboard</p>
        </div>

        {/* Trip Sensor Monitor */}
        <div className={`rounded-xl border p-4 transition-all ${anomalyFlash && tripActive ? "border-amber-400 bg-amber-500/5" : "border-[#2a2a3a] bg-[#111118]"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className={tripActive ? "text-green-400" : "text-[#6b7280]"} />
              <span className="font-semibold text-sm">Trip Sensor Monitor</span>
            </div>
            <button
              onClick={() => setTripActive((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tripActive ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30" : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"}`}
            >
              {tripActive ? <><Square size={12} fill="currentColor" /> Stop</> : <><Play size={12} fill="currentColor" /> Start Trip</>}
            </button>
          </div>

          {tripActive && (
            <>
              {/* Status pill */}
              <div className="flex items-center gap-2 mb-3">
                {motionStatus === "live" ? <Smartphone size={12} className="text-green-400" /> : <Monitor size={12} className="text-amber-400" />}
                <span className={`text-xs font-medium ${statusColor[motionStatus]}`}>{statusLabel[motionStatus]}</span>
                {motionStatus === "mock" && (
                  <span className="text-[10px] text-[#6b7280] ml-1">(open on mobile for real sensors)</span>
                )}
              </div>

              {anomalyFlash && (
                <div className="mb-3 bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={14} />
                  Anomaly detected! Z = {latest?.zAccel.toFixed(2)} m/s²
                  {hasGps ? " — auto-reported" : " — tap GPS to auto-report"}
                </div>
              )}

              <div className="space-y-3">
                {[
                  {
                    label: "Z-Accel (m/s²)",
                    value: latest?.zAccel.toFixed(3) ?? "—",
                    color: Math.abs(latest?.zAccel ?? 0) > ANOMALY_THRESHOLD_MS2 ? "text-red-400" : "text-green-400",
                  },
                  {
                    label: "Gyro X (°/s)",
                    value: latest?.gyroX.toFixed(2) ?? "—",
                    color: Math.abs(latest?.gyroX ?? 0) > 30 ? "text-amber-400" : "text-blue-400",
                  },
                  {
                    label: "Gyro Y (°/s)",
                    value: latest?.gyroY.toFixed(2) ?? "—",
                    color: Math.abs(latest?.gyroY ?? 0) > 30 ? "text-amber-400" : "text-blue-400",
                  },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="text-[#6b7280] text-xs w-28">{m.label}</span>
                    <span className={`font-mono text-sm font-bold ${m.color}`}>{m.value}</span>
                  </div>
                ))}

                {/* Waveform */}
                <div className="mt-2 h-16 flex items-end gap-px overflow-hidden rounded bg-[#0a0a0f] p-2">
                  {chartData.map((d, i) => {
                    const h = Math.min(100, (Math.abs(d.zAccel) / maxZ) * 100);
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${d.anomalyDetected ? "bg-red-400" : "bg-blue-500/60"}`}
                        style={{ height: `${Math.max(h, 4)}%` }}
                      />
                    );
                  })}
                </div>
                <p className="text-[#6b7280] text-[10px]">
                  Z-axis waveform · {readings.length} samples · Red = anomaly spike (&gt;{ANOMALY_THRESHOLD_MS2} m/s²)
                </p>
              </div>
            </>
          )}

          {!tripActive && (
            <p className="text-[#6b7280] text-sm text-center py-4">
              Start a trip to read live {typeof DeviceMotionEvent !== "undefined" ? "device accelerometer & gyroscope" : "sensor"} data. Anomalies auto-report to the dashboard.
            </p>
          )}
        </div>

        {/* Manual Report Form */}
        <div className="rounded-xl border border-[#2a2a3a] bg-[#111118] p-4">
          <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <MapPin size={14} className="text-blue-400" />
            Report a Road Issue
          </h2>

          {submitState === "success" ? (
            <div className="text-center py-6 text-green-400">
              <div className="text-3xl mb-2">✓</div>
              <p className="font-semibold">Report submitted!</p>
              <p className="text-[#6b7280] text-sm mt-1">Visible on the live dashboard now.</p>
            </div>
          ) : submitState === "error" ? (
            <div className="text-center py-6 text-red-400">
              <div className="text-2xl mb-2">✗</div>
              <p className="font-semibold">Submission failed. Try again.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">Issue Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "pothole", label: "🕳️ Pothole" },
                    { value: "speedbreaker", label: "⚠️ Speed Breaker" },
                    { value: "breakdown", label: "🚗 Breakdown" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: opt.value }))}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${form.type === opt.value ? "border-blue-500 bg-blue-500/20 text-blue-400" : "border-[#2a2a3a] text-[#6b7280] hover:border-[#3a3a4a]"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">GPS Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.gps}
                    readOnly
                    placeholder="Tap GPS to auto-detect…"
                    className="flex-1 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#6b7280] outline-none"
                  />
                  <button
                    type="button"
                    onClick={detectGPS}
                    disabled={gpsLoading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  >
                    <Navigation size={12} />
                    {gpsLoading ? "…" : "GPS"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue…"
                  rows={3}
                  className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#6b7280] outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-[#6b7280] mb-1.5 block">Photo (optional)</label>
                <label className="flex items-center justify-center gap-2 border border-dashed border-[#2a2a3a] rounded-lg py-6 cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-[#6b7280] text-sm">
                  <Camera size={16} />
                  Tap to upload photo
                  <input ref={photoRef} type="file" accept="image/*" className="hidden" capture="environment" />
                </label>
              </div>

              <button
                type="submit"
                disabled={submitState === "submitting"}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                {submitState === "submitting" ? "Submitting…" : "Submit Report"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
