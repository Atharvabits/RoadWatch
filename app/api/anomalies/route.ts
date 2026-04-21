import { NextRequest, NextResponse } from "next/server";
import { RoadAnomaly } from "@/lib/types";
import { anomalyStore, addAnomaly, subscribe } from "./store";
import { randomUUID } from "crypto";

// GET  /api/anomalies        — SSE stream of new anomalies
// POST /api/anomalies        — submit a new anomaly (from report form or Go backend)

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send all existing anomalies as a seed event so new clients are immediately populated
      const seed = JSON.stringify(anomalyStore);
      controller.enqueue(encoder.encode(`event: seed\ndata: ${seed}\n\n`));

      // Then stream new ones as they arrive
      const unsub = subscribe((anomaly) => {
        try {
          controller.enqueue(
            encoder.encode(`event: anomaly\ndata: ${JSON.stringify(anomaly)}\n\n`)
          );
        } catch {
          unsub();
        }
      });

      // Heartbeat every 25s to keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          unsub();
        }
      }, 25_000);

      // Cleanup when client disconnects
      return () => {
        clearInterval(heartbeat);
        unsub();
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}

export async function POST(req: NextRequest) {
  let body: Partial<RoadAnomaly>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { lat, lng, type, intensity, location, photoUrl } = body;

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !["pothole", "speedbreaker", "breakdown"].includes(type ?? "")
  ) {
    return NextResponse.json({ error: "Missing required fields: lat, lng, type" }, { status: 422 });
  }

  const anomaly: RoadAnomaly = {
    id: randomUUID(),
    lat,
    lng,
    type: type as RoadAnomaly["type"],
    intensity: typeof intensity === "number" ? Math.min(1, Math.max(0, intensity)) : 0.5,
    timestamp: new Date().toISOString(),
    location: location ?? "User reported",
    hits: 1,
    status: "reported",
    ...(photoUrl ? { photoUrl } : {}),
  };

  addAnomaly(anomaly);

  // Forward to Go backend if configured (non-blocking, best-effort)
  const goBackend = process.env.GO_BACKEND_URL;
  if (goBackend) {
    fetch(`${goBackend}/api/v1/anomalies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(anomaly),
    }).catch(() => {}); // fire-and-forget
  }

  return NextResponse.json(anomaly, { status: 201 });
}
