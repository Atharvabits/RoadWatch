"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export interface MotionReading {
  timestamp: number;
  zAccel: number;   // m/s² (gravity subtracted) — negative = downward dip
  gyroX: number;    // deg/s
  gyroY: number;    // deg/s
  anomalyDetected: boolean;
}

export type MotionStatus =
  | "idle"
  | "requesting"       // waiting for iOS permission prompt
  | "denied"           // user refused / API unavailable
  | "mock"             // desktop fallback
  | "live";            // real hardware

const ANOMALY_THRESHOLD_MS2 = 8;  // m/s² — tunable
const MOCK_INTERVAL_MS = 200;

function mockReading(): MotionReading {
  const spike = Math.random() > 0.87;
  return {
    timestamp: Date.now(),
    zAccel: spike ? -(10 + Math.random() * 8) : -(Math.random() * 1.5),
    gyroX: spike ? (Math.random() - 0.5) * 80 : (Math.random() - 0.5) * 5,
    gyroY: spike ? (Math.random() - 0.5) * 80 : (Math.random() - 0.5) * 5,
    anomalyDetected: spike,
  };
}

export function useDeviceMotion(active: boolean) {
  const [readings, setReadings] = useState<MotionReading[]>([]);
  const [status, setStatus] = useState<MotionStatus>("idle");
  const mockTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null);

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
    const handler = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      const rot = e.rotationRate;
      if (!acc) return;

      // z-axis: subtract ~9.81 (gravity) when phone is flat
      const rawZ = acc.z ?? 0;
      const zAccel = rawZ - 9.81;
      const gyroX = rot?.alpha ?? 0;
      const gyroY = rot?.beta ?? 0;

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
  }, []);

  useEffect(() => {
    if (!active) {
      stopMock();
      stopLive();
      setStatus("idle");
      return;
    }

    // Check if DeviceMotionEvent is available
    if (typeof DeviceMotionEvent === "undefined") {
      startMock();
      return;
    }

    // iOS 13+ requires explicit permission
    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
      setStatus("requesting");
      (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> })
        .requestPermission()
        .then((result) => {
          if (result === "granted") startLive();
          else startMock(); // Denied — fall back to mock
        })
        .catch(() => startMock());
    } else {
      // Android / non-iOS — DeviceMotion available without permission
      // Test if we actually get events (desktop browsers expose the API but fire nothing)
      let gotEvent = false;
      const testHandler = () => { gotEvent = true; };
      window.addEventListener("devicemotion", testHandler);

      setTimeout(() => {
        window.removeEventListener("devicemotion", testHandler);
        if (gotEvent) startLive();
        else startMock();
      }, 500);
    }

    return () => { stopMock(); stopLive(); };
  }, [active, startLive, startMock, stopLive, stopMock]);

  return { readings, status };
}
