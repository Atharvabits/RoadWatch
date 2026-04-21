export interface RoadAnomaly {
  id: string;
  lat: number;
  lng: number;
  type: "pothole" | "speedbreaker" | "breakdown";
  intensity: number; // 0.0 to 1.0
  timestamp: string;
  location?: string;
  hits?: number;
  status?: "reported" | "verified" | "repair_assigned" | "fixed";
  reportedBy?: string;
  photoUrl?: string;
}

export interface SensorReading {
  timestamp: number;
  zAccel: number;
  gyroX: number;
  gyroY: number;
  anomalyDetected: boolean;
}

export interface RepairCrew {
  id: string;
  name: string;
  available: boolean;
}

export const MOCK_ANOMALIES: RoadAnomaly[] = [
  { id: "1", lat: 12.9716, lng: 77.5946, type: "pothole", intensity: 0.9, timestamp: new Date(Date.now() - 120000).toISOString(), location: "Silk Board Junction", hits: 47, status: "verified" },
  { id: "2", lat: 12.9784, lng: 77.6408, type: "pothole", intensity: 0.7, timestamp: new Date(Date.now() - 300000).toISOString(), location: "Whitefield Main Rd", hits: 23, status: "verified" },
  { id: "3", lat: 12.9698, lng: 77.7499, type: "speedbreaker", intensity: 0.5, timestamp: new Date(Date.now() - 600000).toISOString(), location: "ITPL Gate 2", hits: 8, status: "reported" },
  { id: "4", lat: 12.9352, lng: 77.6245, type: "breakdown", intensity: 0.8, timestamp: new Date(Date.now() - 45000).toISOString(), location: "Koramangala 4th Block", hits: 1, status: "reported" },
  { id: "5", lat: 13.0358, lng: 77.5970, type: "pothole", intensity: 0.6, timestamp: new Date(Date.now() - 900000).toISOString(), location: "Hebbal Flyover", hits: 31, status: "repair_assigned" },
  { id: "6", lat: 12.9121, lng: 77.6446, type: "pothole", intensity: 0.4, timestamp: new Date(Date.now() - 1200000).toISOString(), location: "BTM Layout 2nd Stage", hits: 15, status: "verified" },
  { id: "7", lat: 12.9766, lng: 77.5993, type: "speedbreaker", intensity: 0.3, timestamp: new Date(Date.now() - 1800000).toISOString(), location: "MG Road Near Brigade", hits: 5, status: "reported" },
  { id: "8", lat: 12.9958, lng: 77.6961, type: "pothole", intensity: 0.85, timestamp: new Date(Date.now() - 60000).toISOString(), location: "Marathahalli Bridge", hits: 39, status: "verified" },
  { id: "9", lat: 12.9279, lng: 77.6271, type: "breakdown", intensity: 0.9, timestamp: new Date(Date.now() - 15000).toISOString(), location: "Jayanagar 4th Block", hits: 1, status: "reported" },
  { id: "10", lat: 13.0130, lng: 77.5520, type: "pothole", intensity: 0.55, timestamp: new Date(Date.now() - 2400000).toISOString(), location: "Yeshwanthpur Circle", hits: 19, status: "verified" },
];

export const MOCK_CREWS: RepairCrew[] = [
  { id: "c1", name: "BBMP Crew Alpha", available: true },
  { id: "c2", name: "BBMP Crew Beta", available: true },
  { id: "c3", name: "BBMP Crew Gamma", available: false },
];
