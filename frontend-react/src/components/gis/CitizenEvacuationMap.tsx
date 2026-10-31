// ─────────────────────────────────────────────────────────────────────────────
// CitizenEvacuationMap.tsx — Leaflet + OSM Citizen Evacuation Routing Map
// Exactly matches FireSense reference (assets/screenshots/citizen_map.png)
// Renders origin hazard zone, destination safe shelter & dashed safe route line
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  className?: string;
}

export default function CitizenEvacuationMap({ className = '' }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center between Brahmagiri hazard origin and Puri shelter destination
    const map = L.map(mapContainerRef.current, {
      center: [19.805, 85.78],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });
    mapRef.current = map;

    // Standard OpenStreetMap tiles
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Street Map',
    }).addTo(map);

    // Coordinates:
    // Origin: Brahmagiri coastal inundation zone (Red marker)
    const originCoords: [number, number] = [19.7991, 85.7239];
    // Destination: Puri Zilla High School Shelter (Green marker)
    const destCoords: [number, number] = [19.8135, 85.8312];

    // Turnpoints for Safe Evacuation Route (via inland SH-13 & VIP Road avoiding Marine Drive)
    const routeCoords: [number, number][] = [
      [19.7991, 85.7239],
      [19.8040, 85.7480],
      [19.8120, 85.7790],
      [19.8180, 85.8050],
      [19.8135, 85.8312],
    ];

    // Draw Blue Dashed Evacuation Route Line
    const routeLine = L.polyline(routeCoords, {
      color: '#2563eb',
      weight: 5,
      dashArray: '8, 8',
      opacity: 0.9,
    }).addTo(map);

    routeLine.bindTooltip('Safe Evacuation Corridor (SH-13 / VIP Road)', { sticky: true });

    // Red Origin Circle Marker (Incident Danger Zone)
    const originMarker = L.circleMarker(originCoords, {
      radius: 12,
      color: '#dc2626',
      weight: 3,
      fillColor: '#ef4444',
      fillOpacity: 0.65,
    }).addTo(map);

    originMarker.bindTooltip(
      '<strong>Current Location: Brahmagiri Coastal Belt</strong><br/>Status: Inundation Risk Zone',
      { permanent: false, direction: 'top' }
    );

    // Green Destination Circle Marker (Safe Cyclone Shelter)
    const destMarker = L.circleMarker(destCoords, {
      radius: 12,
      color: '#15803d',
      weight: 3,
      fillColor: '#22c55e',
      fillOpacity: 0.75,
    }).addTo(map);

    destMarker.bindTooltip(
      '<strong>Destination: Puri Zilla High School Shelter</strong><br/>Capacity: 450/600 · Generator & Water Ready',
      { permanent: false, direction: 'top' }
    );

    // Fit map bounds to view both markers comfortably
    map.fitBounds(L.latLngBounds(routeCoords).pad(0.2));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Map Container */}
      <div className="relative w-full h-[280px] sm:h-[340px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full citizen-evacuation-map" />
      </div>

      {/* Map Legend matching FireSense screenshot */}
      <div className="flex items-center gap-6 text-xs font-mono font-bold text-slate-700 dark:text-white/70 pt-1 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-600 border border-white shadow-sm"></span>
          <span>Incident / Hazard Zone</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-sm"></span>
          <span>Safe Multipurpose Shelter</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-1 border-b-2 border-dashed border-blue-600"></span>
          <span>Evacuation Route (SH-13 / VIP Rd)</span>
        </div>
      </div>
    </div>
  );
}
