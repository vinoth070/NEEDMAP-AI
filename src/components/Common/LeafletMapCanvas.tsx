import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { AlertTriangle, Crosshair, Maximize2 } from "./Icons";
import { DEFAULT_CAMPUS_CENTER } from '../../data/platformDemoData';
import { useI18n } from '../../i18n/I18nContext';
import type { PriorityTier } from '../../types/needmap';

export interface MapMarkerItem {
  id: string;
  kind: 'complaint' | 'opportunity';
  lat: number;
  lng: number;
  title: string;
  categoryLabel: string;
  statusLabel: string;
  priorityTier: PriorityTier;
  locationLabel: string;
  reportCount?: number;
}

interface LeafletMapCanvasProps {
  mode: 'explorer' | 'picker';
  markers?: MapMarkerItem[];
  selectedMarkerId?: string | null;
  onSelectMarker?: (id: string, kind: 'complaint' | 'opportunity') => void;
  pickedCoords?: { lat: number; lng: number } | null;
  onPickCoords?: (lat: number, lng: number) => void;
  heightClassName?: string;
}

interface MarkerClusterGroup {
  id: string;
  lat: number;
  lng: number;
  items: MapMarkerItem[];
}

function getTierHex(tier: PriorityTier, kind: 'complaint' | 'opportunity'): string {
  if (tier === 'High') return kind === 'complaint' ? '#e11d48' : '#0f766e';
  if (tier === 'Medium') return '#4f46e5';
  return '#64748b';
}

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Groups nearby markers into clean numbered clusters when zoomed out so dense campus/city
 * points remain readable without external Leaflet plugin CSS issues.
 */
function clusterNearbyMarkers(markers: MapMarkerItem[], zoom: number): MarkerClusterGroup[] {
  if (zoom >= 16 || markers.length <= 1) {
    return markers.map((m) => ({
      id: m.id,
      lat: m.lat,
      lng: m.lng,
      items: [m],
    }));
  }

  // Degree threshold scales with zoom level
  const thresholdDeg = zoom <= 13 ? 0.006 : zoom === 14 ? 0.0025 : 0.0011;
  const visited = new Set<string>();
  const groups: MarkerClusterGroup[] = [];

  for (let i = 0; i < markers.length; i++) {
    const base = markers[i];
    if (visited.has(base.id)) continue;
    visited.add(base.id);

    const clusterItems: MapMarkerItem[] = [base];
    for (let j = i + 1; j < markers.length; j++) {
      const other = markers[j];
      if (visited.has(other.id)) continue;
      const dist = Math.hypot(base.lat - other.lat, base.lng - other.lng);
      if (dist <= thresholdDeg) {
        visited.add(other.id);
        clusterItems.push(other);
      }
    }

    const avgLat = clusterItems.reduce((s, x) => s + x.lat, 0) / clusterItems.length;
    const avgLng = clusterItems.reduce((s, x) => s + x.lng, 0) / clusterItems.length;

    groups.push({
      id: clusterItems.length === 1 ? base.id : `CLUSTER-${base.id}-${clusterItems.length}`,
      lat: avgLat,
      lng: avgLng,
      items: clusterItems,
    });
  }

  return groups;
}

export const LeafletMapCanvas: React.FC<LeafletMapCanvasProps> = ({
  mode,
  markers = [],
  selectedMarkerId,
  onSelectMarker,
  pickedCoords,
  onPickCoords,
  heightClassName = 'h-[420px]',
}) => {
  const { tr } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [zoomLevel, setZoomLevel] = useState(15);
  const [tileWarning, setTileWarning] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Leaflet Map instance once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter =
      pickedCoords ||
      (markers.length > 0
        ? { lat: markers[0].lat, lng: markers[0].lng }
        : DEFAULT_CAMPUS_CENTER);

    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    });

    let tileErrors = 0;
    tiles.on('tileerror', () => {
      tileErrors += 1;
      if (tileErrors >= 3) {
        setTileWarning(true);
      }
    });
    tiles.on('tileload', () => {
      setTileWarning(false);
    });

    tiles.addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapRef.current = map;

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach map click listener in picker mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'picker') return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      onPickCoords?.(lat, lng);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [mode, onPickCoords]);

  const clusteredGroups = useMemo(
    () => clusterNearbyMarkers(markers, zoomLevel),
    [markers, zoomLevel]
  );

  // Render Explorer Markers or Picker Pin
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (mode === 'picker') {
      if (pickedCoords && Number.isFinite(pickedCoords.lat) && Number.isFinite(pickedCoords.lng)) {
        const pinIcon = L.divIcon({
          className: 'needmap-custom-pin',
          html: `<div style="width:28px;height:28px;border-radius:9999px;background:#0f766e;border:3px solid #ffffff;box-shadow:0 3px 10px rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">+</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([pickedCoords.lat, pickedCoords.lng], {
          icon: pinIcon,
          draggable: true,
        });

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onPickCoords?.(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
        });

        marker.addTo(group);
        map.panTo([pickedCoords.lat, pickedCoords.lng], { animate: true });
      }
      return;
    }

    // Explorer Mode
    for (const cluster of clusteredGroups) {
      if (cluster.items.length > 1) {
        const hasHigh = cluster.items.some((x) => x.priorityTier === 'High');
        const bg = hasHigh ? '#0f766e' : '#4f46e5';

        const clusterIcon = L.divIcon({
          className: 'needmap-cluster-pin',
          html: `<div style="width:36px;height:36px;border-radius:9999px;background:${bg};border:3px solid #ffffff;box-shadow:0 3px 10px rgba(15,23,42,0.3);display:flex;align-items:center;justify-content:center;color:#ffffff;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700;">${cluster.items.length}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const cMarker = L.marker([cluster.lat, cluster.lng], { icon: clusterIcon });
        cMarker.on('click', () => {
          map.setView([cluster.lat, cluster.lng], Math.min(18, map.getZoom() + 2), {
            animate: true,
          });
        });
        cMarker.bindTooltip(
          `${cluster.items.length} ${tr('nearby items : click to zoom in', 'அருகிலுள்ள பதிவுகள் : பெரிதாக்க சொடுக்கவும்')}`,
          { direction: 'top' }
        );
        cMarker.addTo(group);
      } else {
        const item = cluster.items[0];
        const isSelected = selectedMarkerId === item.id;
        const hex = getTierHex(item.priorityTier, item.kind);
        const size = isSelected ? 32 : 24;
        const ring = isSelected ? '3px solid #0f172a' : '2.5px solid #ffffff';
        const shapeRadius = item.kind === 'complaint' ? '9999px' : '8px';

        const icon = L.divIcon({
          className: 'needmap-item-pin',
          html: `<div style="width:${size}px;height:${size}px;border-radius:${shapeRadius};background:${hex};border:${ring};box-shadow:0 2px 8px rgba(15,23,42,0.32);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:700;">${
            item.kind === 'complaint' ? '!' : item.reportCount ?? '★'
          }</div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([item.lat, item.lng], { icon });
        const popupHtml = `
          <div style="min-width:200px;max-width:250px;font-family:'Public Sans',sans-serif;line-height:1.4;">
            <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;opacity:0.75;">${escapeHtml(item.id)} · ${escapeHtml(item.categoryLabel)}</div>
            <div style="font-weight:700;font-size:13px;margin-top:3px;">${escapeHtml(item.title)}</div>
            <div style="font-size:11px;margin-top:4px;opacity:0.85;">${escapeHtml(item.locationLabel)}</div>
            <div style="font-size:11px;font-weight:600;margin-top:5px;color:${hex};">${escapeHtml(item.statusLabel)}</div>
          </div>
        `;
        marker.bindPopup(popupHtml);
        marker.on('click', () => {
          onSelectMarker?.(item.id, item.kind);
        });

        marker.addTo(group);

        if (isSelected) {
          marker.openPopup();
        }
      }
    }
  }, [clusteredGroups, mode, onPickCoords, onSelectMarker, pickedCoords, selectedMarkerId, tr]);

  const handleFitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || markers.length === 0) return;
    if (markers.length === 1) {
      map.setView([markers[0].lat, markers[0].lng], 16, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 17 });
  }, [markers]);

  const handleUseCurrentGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus(
        tr(
          'Browser GPS is unavailable on this device. Click the map to place a pin or type an address.',
          'இந்த சாதனத்தில் GPS வசதி இல்லை. வரைபடத்தில் சொடுக்கி இடத்தைக் குறிக்கவும்.'
        )
      );
      return;
    }

    setIsLocating(true);
    setGpsStatus(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onPickCoords?.(lat, lng);
        mapRef.current?.setView([lat, lng], 16, { animate: true });
        setGpsStatus(
          tr(
            `GPS coordinates captured (${lat}, ${lng}). You can drag the pin to fine-tune.`,
            `GPS இருப்பிடம் பெறப்பட்டது (${lat}, ${lng}). ஊசியை நகர்த்தித் துல்லியப்படுத்தலாம்.`
          )
        );
      },
      () => {
        setIsLocating(false);
        setGpsStatus(
          tr(
            'Location permission was denied or unavailable. Click directly on the map or enter a written address.',
            'இருப்பிட அனுமதி மறுக்கப்பட்டது. வரைபடத்தில் நேராகச் சொடுக்கவும் அல்லது முகவரியை உள்ளிடவும்.'
          )
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [onPickCoords, tr]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
        <div ref={containerRef} className={`w-full ${heightClassName}`} />

        {/* Overlay Controls (Kept cleanly inside z-20 above Leaflet z-15) */}
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-wrap items-center gap-2">
          {mode === 'explorer' && markers.length > 0 && (
            <button
              type="button"
              onClick={handleFitAll}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Maximize2 className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              {tr('Fit All Pins', 'அனைத்து இடங்களையும் காட்டு')}
            </button>
          )}

          {mode === 'picker' && (
            <button
              type="button"
              onClick={handleUseCurrentGps}
              disabled={isLocating}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
            >
              <Crosshair className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              {isLocating
                ? tr('Detecting GPS...', 'GPS தேடுகிறது...')
                : tr('Use My GPS Location', 'எனது GPS இருப்பிடம்')}
            </button>
          )}
        </div>
      </div>

      {tileWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            {tr(
              'Map street tiles could not be reached on this network, but interactive coordinate pins and list filters remain fully functional.',
              'தெரு வரைபடப் படங்களை ஏற்ற இயலவில்லை; எனினும் இருப்பிடப் புள்ளிகளும் பட்டியல் வடிகட்டிகளும் தொடர்ந்து செயல்படும்.'
            )}
          </span>
        </div>
      )}

      {gpsStatus && (
        <p className="text-xs text-slate-600 dark:text-slate-400">{gpsStatus}</p>
      )}
    </div>
  );
};
