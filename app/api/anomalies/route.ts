import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { anomalies } from "@/db/schema";
import { RoadAnomaly } from "@/lib/types";
import { broadcast, subscribe } from "./store";

// GET  /api/anomalies  — SSE stream; seeds with last 200 DB rows then pushes new ones live
// POST /api/anomalies  — persist a new anomaly and broadcast it to all SSE clients

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Fetch the last 200 anomalies from Neon as the seed
      let seed: RoadAnomaly[] = [];
      try {
        const rows = await db
          .select()
          .from(anomalies)
          .orderBy(desc(anomalies.createdAt))
          .limit(200);

        seed = rows.map(rowToAnomaly).reverse(); // oldest-first so the feed renders in order
      } catch (err) {
        console.error("Failed to seed SSE from DB:", err);
      }

      try {
        controller.enqueue(encoder.encode(`event: seed\ndata: ${JSON.stringify(seed)}\n\n`));
      } catch {
        return;
      }

      const unsub = subscribe((anomaly) => {
        try {
          controller.enqueue(
            encoder.encode(`event: anomaly\ndata: ${JSON.stringify(anomaly)}\n\n`)
          );
        } catch {
          unsub();
        }
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          unsub();
        }
      }, 25_000);

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
      "X-Accel-Buffering": "no",
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

  const id = randomUUID();
  const now = new Date();
  const safeIntensity = typeof intensity === "number" ? Math.min(1, Math.max(0, intensity)) : 0.5;

  // Persist to Neon
  await db.insert(anomalies).values({
    id,
    lat,
    lng,
    type: type as "pothole" | "speedbreaker" | "breakdown",
    intensity: safeIntensity,
    location: location ?? "User reported",
    hits: 1,
    status: "reported",
    photoUrl: photoUrl ?? null,
    createdAt: now,
  });

  const anomaly: RoadAnomaly = {
    id,
    lat,
    lng,
    type: type as RoadAnomaly["type"],
    intensity: safeIntensity,
    timestamp: now.toISOString(),
    location: location ?? "User reported",
    hits: 1,
    status: "reported",
    ...(photoUrl ? { photoUrl } : {}),
  };

  // Broadcast to all connected SSE clients
  broadcast(anomaly);

  // Forward to Go backend if configured (fire-and-forget)
  const goBackend = process.env.GO_BACKEND_URL;
  if (goBackend) {
    fetch(`${goBackend}/api/v1/anomalies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(anomaly),
    }).catch(() => {});
  }

  return NextResponse.json(anomaly, { status: 201 });
}

function rowToAnomaly(row: typeof anomalies.$inferSelect): RoadAnomaly {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    type: row.type,
    intensity: row.intensity,
    timestamp: row.createdAt.toISOString(),
    location: row.location ?? undefined,
    hits: row.hits,
    status: row.status,
    photoUrl: row.photoUrl ?? undefined,
  };
}
