"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface MotionReading {
  timestamp: number;
  zAccel: number;        // gravity-free Z in m/s² — spikes on road bumps
  gyroX: number;         // deg/s
  gyroY: number;         // deg/s
  anomalyDetected: boolean;
}

export type MotionStatus =
  | "idle"
  | "requesting"   // waiting for iOS permission prompt
  | "denied"
  | "mock"         // desktop fallback — no real sensor
  | "live";        // real hardware

// A bump/pothole causes a sudden Z spike of ~2–6 m/s² above baseline.
// Threshold is intentionally low so it reacts to real road roughness.
export const ANOMALY_THRESHOLD_MS2 = 3.5;

const MOCK_INTERVAL_MS = 200;
// How many samples to average for the dynamic gravity baseline
const BASELINE_WINDOW = 20;

function mockReading(): MotionReading {
  const spike = Math.random() > 0.87;
  return {
    timestamp: Date.now(),
    zAccel: spike ? -(4 + Math.random() * 6) : (Math.random() - 0.5) * 0.8,
    gyroX: spike ? (Math.random() - 0.5) * 60 : (Math.random() - 0.5) * 4,
    gyroY: spike ? (Math.random() - 0.5) * 60 : (Math.random() - 0.5) * 4,
    anomalyDetected: spike,
  };
}

export function useDeviceMotion(active: boolean) {
  const [readings, setReadings] = useState<MotionReading[]>([]);
  const [status, setStatus] = useState<MotionStatus>("idle");

  const mockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);
  // Rolling buffer of raw Z values used to compute a dynamic gravity baseline
  const baselineBuffer = useRef<number[]>([]);

  const pushReading = useCallback((r: MotionReading) => {
    setReadings((prev) => [...prev.slice(-200), r]);
  }, []);

  const startMock = useCallback(() => {
    setStatus("mock");
    mockTimer.current = setInterval(() => pushReading(mockReading()), MOCK_INTERVAL_MS);
  }, [pushReading]);

  const stopMock = useCallback(() => {
    if (mockTimer.current) { clearInterval(mockTimer.current); mockTimer.current = null; }
  }, []);

  const startLive = useCallback(() => {
    setStatus("live");
    baselineBuffer.current = [];

    const handler = (e: DeviceMotionEvent) => {
      const rot = e.rotationRate;

      // Prefer `acceleration` (OS already removes gravity via sensor fusion).
      // Fall back to `accelerationIncludingGravity` with a rolling baseline if unavailable.
      let zAccel: number;

      if (e.acceleration?.z != null) {
        zAccel = e.acceleration.z;
      } else {
        const rawZ = e.accelerationIncludingGravity?.z ?? 0;
        // Build a rolling baseline of the last N raw-Z samples.
        // This adapts to any phone orientation (portrait, landscape, tilted).
        baselineBuffer.current.push(rawZ);
        if (baselineBuffer.current.length > BASELINE_WINDOW) {
          baselineBuffer.current.shift();
        }
        const baseline =
          baselineBuffer.current.reduce((s, v) => s + v, 0) /
          baselineBuffer.current.length;
        // During the warm-up window just emit the raw Z so waveform moves immediately
        zAccel = baselineBuffer.current.length < BASELINE_WINDOW
          ? rawZ - baseline   // partial baseline is still better than nothing
          : rawZ - baseline;
      }

      const gyroX = rot?.beta  ?? 0;   // beta  = tilt front/back
      const gyroY = rot?.gamma ?? 0;   // gamma = tilt left/right

      pushReading({
        timestamp: Date.now(),
        zAccel,
        gyroX,
        gyroY,
        anomalyDetected: Math.abs(zAccel) > ANOMALY_THRESHOLD_MS2,
      });
    };

    listenerRef.current = handler;
    window.addEventListener("devicemotion", handler);
  }, [pushReading]);

  const stopLive = useCallback(() => {
    if (listenerRef.current) {
      window.removeEventListener("devicemotion", listenerRef.current);
      listenerRef.current = null;
    }
    baselineBuffer.current = [];
  }, []);

  useEffect(() => {
    if (!active) {
      stopMock();
      stopLive();
      setStatus("idle");
      return;
    }

    if (typeof DeviceMotionEvent === "undefined") {
      startMock();
      return;
    }

    // iOS 13+ requires explicit permission — must be triggered by a user gesture
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<PermissionState>;
    };

    if (typeof DME.requestPermission === "function") {
      setStatus("requesting");
      DME.requestPermission()
        .then((result) => {
          if (result === "granted") startLive();
          else { setStatus("denied"); startMock(); }
        })
        .catch(() => { setStatus("denied"); startMock(); });
    } else {
      // Android / desktop: attach listener and wait briefly to confirm events fire.
      // Desktop browsers expose DeviceMotionEvent but never dispatch it.
      let gotEvent = false;
      const probe = (e: DeviceMotionEvent) => {
        // A real device will have non-null acceleration values
        if (
          e.acceleration != null ||
          e.accelerationIncludingGravity?.x != null ||
          e.accelerationIncludingGravity?.z != null
        ) {
          gotEvent = true;
        }
      };
      window.addEventListener("devicemotion", probe);

      setTimeout(() => {
        window.removeEventListener("devicemotion", probe);
        if (gotEvent) startLive();
        else startMock();
      }, 600);
    }

    return () => { stopMock(); stopLive(); };
  }, [active, startLive, startMock, stopLive, stopMock]);

  return { readings, status };
}
