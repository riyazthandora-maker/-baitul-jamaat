"use client";

import { useEffect, useRef } from "react";

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
}

const DEFAULT_LAT = 20.5937;
const DEFAULT_LNG = 78.9629;

export default function MapPickerInner({ lat, lng, onChange }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Guard against React StrictMode double-mount: Leaflet marks the container
    // with the "leaflet-container" class after first init.
    if (mapRef.current.classList.contains("leaflet-container")) return;

    // Also guard via ref in case the class check races
    if (mapInstanceRef.current) return;

    let destroyed = false;

    (async () => {
      const L = (await import("leaflet")).default;

      if (destroyed || !mapRef.current) return;

      // Fix Leaflet default marker icons in webpack/turbopack bundlers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const initialLat = lat ?? DEFAULT_LAT;
      const initialLng = lng ?? DEFAULT_LNG;

      const map = L.map(mapRef.current).setView(
        [initialLat, initialLng],
        lat ? 13 : 5
      );
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      if (lat && lng) {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
        }
        onChange(clickLat, clickLng);
      });
    })();

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
    };
    // Props are captured once on mount — intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-1">
      <div
        ref={mapRef}
        className="w-full h-64 rounded-xl border border-gray-300 overflow-hidden"
      />
      <p className="text-xs text-gray-400">
        Click on the map to pin the masjid location
      </p>
    </div>
  );
}
