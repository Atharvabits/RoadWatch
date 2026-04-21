// In-memory store shared across the Next.js process.
// Swap this out for a real DB (Drizzle/Postgres) when the Go backend is ready.

import { RoadAnomaly, MOCK_ANOMALIES } from "@/lib/types";

// Seeded with mock data so the dashboard isn't empty on first load.
export const anomalyStore: RoadAnomaly[] = [...MOCK_ANOMALIES];

type Listener = (anomaly: RoadAnomaly) => void;
const listeners = new Set<Listener>();

export function addAnomaly(a: RoadAnomaly) {
  anomalyStore.push(a);
  listeners.forEach((fn) => fn(a));
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
