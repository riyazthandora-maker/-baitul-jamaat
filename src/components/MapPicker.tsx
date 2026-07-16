"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
}

// Leaflet is loaded lazily to avoid SSR issues
export default function MapPicker({ lat, lng, onChange }: Props) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<Props> | null>(null);

  useEffect(() => {
    import("./MapPickerInner").then((mod) => {
      setMapComponent(() => mod.default);
    });
  }, []);

  if (!MapComponent) {
    return (
      <div className="w-full h-64 rounded-xl border bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400">
        <MapPin className="w-8 h-8" />
        <span className="text-sm">Loading map…</span>
      </div>
    );
  }

  return <MapComponent lat={lat} lng={lng} onChange={onChange} />;
}
