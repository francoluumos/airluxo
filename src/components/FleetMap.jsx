import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fallback centroids for cars whose location has no precise lat/lng yet.
export const CITY_COORDS = {
  Geneva: [46.2044, 6.1432],
  'Zürich': [47.3769, 8.5417],
  Lugano: [46.0037, 8.9511],
  Lausanne: [46.5197, 6.6323],
  Basel: [47.5596, 7.5886],
  Bern: [46.948, 7.4474],
  'St. Moritz': [46.4908, 9.8355],
  Zermatt: [46.0207, 7.7491],
  Gstaad: [46.4725, 7.2861],
};
const SWISS_CENTER = [46.78, 8.23];
const chf = (n) => 'CHF ' + Math.round(n).toLocaleString('de-CH');

export default function FleetMap({ cars, onCity }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const onCityRef = useRef(onCity);
  onCityRef.current = onCity;

  useEffect(() => {
    if (mapRef.current || !elRef.current) return;
    const map = L.map(elRef.current, {
      center: SWISS_CENTER,
      zoom: 7,
      minZoom: 6,
      maxZoom: 13,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });
    // CARTO Positron, warm-tinted via CSS to sit on AIRLUXO's paper palette.
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap, &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    // group cars by precise coordinate when available, else by city centroid
    const groups = {};
    (cars ?? []).forEach((c) => {
      let coord = null;
      let key = null;
      if (typeof c.lat === 'number' && typeof c.lng === 'number') {
        coord = [c.lat, c.lng];
        key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      } else if (CITY_COORDS[c.location]) {
        coord = CITY_COORDS[c.location];
        key = c.location;
      }
      if (!coord) return;
      (groups[key] ||= { coord, city: c.location, list: [] }).list.push(c);
    });

    const bounds = [];
    Object.values(groups).forEach(({ coord, city, list }) => {
      const from = Math.min(...list.map((c) => c.pricePerDay));
      const icon = L.divIcon({
        className: 'alx-pin-wrap',
        html: `<span class="alx-halo"></span><div class="alx-pin"><span>${list.length}</span></div>`,
        iconSize: [44, 52],
        iconAnchor: [22, 48],
        popupAnchor: [0, -46],
      });
      const m = L.marker(coord, { icon }).addTo(layer);
      m.bindPopup(
        `<div class="alx-pop-city">${city || 'Switzerland'}</div><div class="alx-pop-meta">${list.length} car${list.length > 1 ? 's' : ''} · from ${chf(from)}</div>`,
        { closeButton: false, offset: [0, 0] }
      );
      m.on('mouseover', () => m.openPopup());
      m.on('click', () => onCityRef.current && city && onCityRef.current(city));
      bounds.push(coord);
    });

    if (bounds.length > 1) {
      try { map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 }); } catch { /* ignore */ }
    }
  }, [cars]);

  return (
    <div className="relative">
      <div ref={elRef} className="alx-map h-[460px] w-full overflow-hidden rounded-[var(--radius-card)] border border-mist" />
      {/* depth + warmth overlay, matching the paper aesthetic */}
      <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-card)] [box-shadow:inset_0_0_0_1px_rgba(11,11,12,0.05),inset_0_40px_90px_-60px_rgba(11,11,12,0.45)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-t-[var(--radius-card)] bg-gradient-to-b from-paper/55 to-transparent" />
    </div>
  );
}
