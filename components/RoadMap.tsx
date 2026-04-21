"use client";
import { useEffect, useRef } from "react";
import { RoadAnomaly } from "@/lib/types";

interface Props {
  anomalies: RoadAnomaly[];
}

// Intensity 0→1 maps green→red in HSL
function intensityColor(v: number): string {
  const hue = Math.round((1 - v) * 120);
  return `hsl(${hue}, 80%, 50%)`;
}

export default function RoadMap({ anomalies }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markersRef = useRef<Record<string, import("leaflet").CircleMarker | import("leaflet").Marker>>({});
  const heatRef = useRef<import("leaflet").Layer | null>(null);

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;

    (async () => {
      const L = (await import("leaflet")).default;

      const map = L.map(mapContainer.current!, {
        center: [12.9784, 77.6408],
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Dark Matter — free, no token, looks great
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        // Attribution required by CARTO/OSM licenses
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(map);

      // Attribution in a compact corner
      L.control.attribution({ position: "bottomright", prefix: false }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Re-render markers whenever anomalies change
  useEffect(() => {
    if (!mapRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current!;

      // Remove stale heatmap overlay and rebuild simple circle heatmap
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }

      // Simple heatmap: low-opacity large circles for pothole density
      const heatGroup = L.layerGroup();
      anomalies
        .filter((a) => a.type === "pothole")
        .forEach((a) => {
          L.circle([a.lat, a.lng], {
            radius: 120,
            color: "transparent",
            fillColor: intensityColor(a.intensity),
            fillOpacity: 0.18 + a.intensity * 0.25,
            interactive: false,
          }).addTo(heatGroup);
        });
      heatGroup.addTo(map);
      heatRef.current = heatGroup;

      // Add markers only for new anomalies
      anomalies.forEach((a) => {
        if (markersRef.current[a.id]) return;

        let marker: import("leaflet").CircleMarker | import("leaflet").Marker;

        if (a.type === "breakdown") {
          const icon = L.divIcon({
            html: `
              <div style="position:relative;width:24px;height:24px">
                <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.3);animation:pulse-ring 1.5s ease-out infinite"></div>
                <div style="position:absolute;inset:3px;border-radius:50%;background:#ef4444;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;font-weight:bold">!</div>
              </div>`,
            className: "",
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });
          marker = L.marker([a.lat, a.lng], { icon })
            .bindTooltip(`🚨 Breakdown: ${a.location}`, { direction: "top" });
        } else if (a.type === "pothole") {
          marker = L.circleMarker([a.lat, a.lng], {
            radius: 6 + a.intensity * 6,
            color: "white",
            weight: 1.5,
            fillColor: intensityColor(a.intensity),
            fillOpacity: 0.9,
          }).bindTooltip(`🕳️ Pothole · ${a.location} · intensity ${a.intensity.toFixed(1)}`, { direction: "top" });
        } else {
          marker = L.circleMarker([a.lat, a.lng], {
            radius: 7,
            color: "white",
            weight: 1.5,
            fillColor: "#f59e0b",
            fillOpacity: 0.9,
          }).bindTooltip(`⚠️ Speed breaker · ${a.location}`, { direction: "top" });
        }

        marker.addTo(map);
        markersRef.current[a.id] = marker;
      });
    })();
  }, [anomalies]);

  return <div ref={mapContainer} className="w-full h-full" style={{ background: "#0a0a0f" }} />;
}
