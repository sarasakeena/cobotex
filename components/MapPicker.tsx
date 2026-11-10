"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix custom icon for Leaflet without broken static asset URLs
const customMarkerIcon = L.divIcon({
  className: "custom-leaflet-pin",
  html: `
    <div style="position: relative; width: 32px; height: 32px; transform: translate(-50%, -100%);">
      <svg viewBox="0 0 24 24" fill="#dc2626" stroke="#ffffff" stroke-width="2" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5" fill="#ffffff"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface MapPickerProps {
  position: { lat: number; lng: number } | null;
  onPositionChange: (pos: { lat: number; lng: number }) => void;
}

function LocationMarker({
  position,
  onPositionChange,
}: {
  position: { lat: number; lng: number } | null;
  onPositionChange: (pos: { lat: number; lng: number }) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.setView([position.lat, position.lng], map.getZoom());
    }
  }, [position, map]);

  return position ? (
    <Marker position={[position.lat, position.lng]} icon={customMarkerIcon} />
  ) : null;
}

export default function MapPicker({
  position,
  onPositionChange,
}: MapPickerProps) {
  // Default center: if coordinates given use them, else fallback to a default view (e.g. New Delhi / generic city)
  const defaultCenter = position || { lat: 28.6139, lng: 77.209 };

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-300 shadow-inner relative z-0">
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          position={position}
          onPositionChange={onPositionChange}
        />
      </MapContainer>
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-900/80 text-white text-[11px] px-2.5 py-1 rounded-md backdrop-blur-sm pointer-events-none">
        Tap anywhere on the map to place incident pin
      </div>
    </div>
  );
}

