"use client";

import { useEffect, useRef } from "react";
import type { MappedFuelStop } from "@/lib/routing/osm-stops";
import { cn } from "@/lib/utils";
import "leaflet/dist/leaflet.css";

type LeafletMap = import("leaflet").Map;

export function FuelStopMap({
  center,
  stops,
  selectedId,
  onSelect,
  onMapClick,
}: {
  center: { lat: number; lng: number };
  stops: MappedFuelStop[];
  selectedId: string | null;
  onSelect: (stop: MappedFuelStop) => void;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([center.lat, center.lng], 10);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      map.on("click", (event) => onMapClickRef.current(event.latlng.lat, event.latlng.lng));
      mapRef.current = map;
    };
    void setup();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], map.getZoom() > 8 ? map.getZoom() : 10);
  }, [center.lat, center.lng]);

  useEffect(() => {
    const update = async () => {
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      const L = await import("leaflet");
      layer.clearLayers();
      for (const stop of stops) {
        const selected = stop.id === selectedId;
        const marker = L.circleMarker([stop.lat, stop.lng], {
          radius: selected ? 11 : stop.truckFriendly ? 8 : 6,
          color: "#176BFF",
          weight: 2,
          fillColor: selected ? "#66B7FF" : stop.truckFriendly ? "#176BFF" : "#0B1728",
          fillOpacity: 0.9,
        });
        marker.bindTooltip(stop.name);
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          onSelect(stop);
        });
        marker.addTo(layer);
      }
    };
    void update();
  }, [onSelect, selectedId, stops]);

  return (
    <div
      ref={containerRef}
      className={cn("h-[28rem] w-full overflow-hidden rounded-xl border border-steel/25 bg-warm")}
      aria-label="Fuel stop map"
    />
  );
}
