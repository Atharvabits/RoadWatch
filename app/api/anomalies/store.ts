// SSE pub/sub — in-process only, intentionally not persisted.
// Persistence is handled by Neon via Drizzle in route.ts.

import { RoadAnomaly } from "@/lib/types";

type Listener = (anomaly: RoadAnomaly) => void;
const listeners = new Set<Listener>();

export function broadcast(a: RoadAnomaly) {
  listeners.forEach((fn) => fn(a));
}

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
