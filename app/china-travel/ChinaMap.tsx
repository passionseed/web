"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CHINA_LOCATIONS, type Location } from "./locations";

interface Props {
  selectedId: number | null;
  onPinClick: (location: Location) => void;
}

function createPinIcon(isSelected: boolean) {
  const bg = isSelected ? "#f97316" : "#1e3a8a";
  const border = isSelected ? "#fed7aa" : "#93c5fd";
  const shadow = isSelected ? "0 2px 10px rgba(249,115,22,0.6)" : "0 2px 8px rgba(0,0,0,0.4)";
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px;
      height: 28px;
      background: ${bg};
      border: 2px solid ${border};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: ${shadow};
      transition: background 0.2s;
    ">
      <span style="
        transform: rotate(45deg);
        color: white;
        font-size: 12px;
        line-height: 1;
      ">★</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

function FlyToSelected({ selectedId }: { selectedId: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedId === null) return;
    const loc = CHINA_LOCATIONS.find((l) => l.id === selectedId);
    if (loc) {
      map.flyTo(loc.coords, 9, { duration: 1.2 });
    }
  }, [selectedId, map]);
  return null;
}

export default function ChinaMap({ selectedId, onPinClick }: Props) {
  return (
    <MapContainer
      center={[35.86, 104.19]}
      zoom={5}
      className="w-full h-full"
      zoomControl={true}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FlyToSelected selectedId={selectedId} />
      <MarkerClusterGroup
        chunkedLoading
        showCoverageOnHover={false}
        maxClusterRadius={50}
      >
        {CHINA_LOCATIONS.map((loc) => (
          <Marker
            key={loc.id}
            position={loc.coords}
            icon={createPinIcon(loc.id === selectedId)}
            eventHandlers={{
              click: () => onPinClick(loc),
            }}
          />
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
