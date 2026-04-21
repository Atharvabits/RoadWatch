import { RoadAnomaly } from "./types";

const LOCATIONS = [
  { lat: 12.9716, lng: 77.5946, name: "Silk Board Junction" },
  { lat: 12.9784, lng: 77.6408, name: "Whitefield Main Rd" },
  { lat: 12.9352, lng: 77.6245, name: "Koramangala 4th Block" },
  { lat: 13.0358, lng: 77.5970, name: "Hebbal Flyover" },
  { lat: 12.9958, lng: 77.6961, name: "Marathahalli Bridge" },
  { lat: 12.9279, lng: 77.6271, name: "Jayanagar 4th Block" },
  { lat: 12.9698, lng: 77.7499, name: "ITPL Gate 2" },
];

const TYPES: RoadAnomaly["type"][] = ["pothole", "speedbreaker", "breakdown"];

let idCounter = 100;

export function createMockWebSocket(onMessage: (anomaly: RoadAnomaly) => void): () => void {
  const interval = setInterval(() => {
    const loc = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    const anomaly: RoadAnomaly = {
      id: String(idCounter++),
      lat: loc.lat + (Math.random() - 0.5) * 0.01,
      lng: loc.lng + (Math.random() - 0.5) * 0.01,
      type,
      intensity: Math.round((0.3 + Math.random() * 0.7) * 10) / 10,
      timestamp: new Date().toISOString(),
      location: loc.name,
      hits: 1,
      status: "reported",
    };
    onMessage(anomaly);
  }, 4000);

  return () => clearInterval(interval);
}

export function mockSensorData() {
  const base = Math.random() * 0.3;
  const spike = Math.random() > 0.85;
  return {
    timestamp: Date.now(),
    zAccel: spike ? -(2.5 + Math.random() * 4) : -(base + 0.9),
    gyroX: spike ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 0.2,
    gyroY: spike ? (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 0.2,
    anomalyDetected: spike,
  };
}
