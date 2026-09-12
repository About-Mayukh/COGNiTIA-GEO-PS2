import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { HighwaySegment, SegmentRiskTelemetry, WeatherStation } from '../types';
import { 
  Layers, 
  Maximize2, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Eye, 
  Radio, 
  RefreshCw, 
  Sparkles,
  Search,
  MapPin,
  LocateFixed,
  Car,
  Navigation,
  X,
  Compass,
  Info
} from 'lucide-react';
import { fetchOverpassRoadData, OverpassMapFeature } from '../utils/overpassService';

const CARTO_KEY = 'cb1_3hrj_1_355382f94e5e14940147265c';
const TOMTOM_KEY = 'isphQ4ZyuO9NEBseVMVOYgyzw2Z8NnVZ';

interface MapDashboardProps {
  segments: HighwaySegment[];
  telemetries: Map<string, SegmentRiskTelemetry>;
  selectedSegmentId: string | null;
  onSelectSegment: (id: string) => void;
  weatherStations: WeatherStation[];
  routeMinKm?: number;
  routeMaxKm?: number;
  fromLocationName?: string;
  toLocationName?: string;
}

export const MapDashboard: React.FC<MapDashboardProps> = ({
  segments,
  telemetries,
  selectedSegmentId,
  onSelectSegment,
  weatherStations,
  routeMinKm,
  routeMaxKm,
  fromLocationName,
  toLocationName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const polylinesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const weatherLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const overpassLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeBaseLayer, setActiveBaseLayer] = useState<'dark' | 'tomtom_dark' | 'satellite' | 'topo'>('dark');
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLabelsLayerRef = useRef<L.TileLayer | null>(null);
  const tomtomTrafficLayerRef = useRef<L.TileLayer | null>(null);

  // Live TomTom Traffic Flow Layer state
  const [showTrafficLayer, setShowTrafficLayer] = useState<boolean>(true);

  // Overpass Public API State (overpass-api.de/api/interpreter)
  const [overpassFeatures, setOverpassFeatures] = useState<OverpassMapFeature[]>([]);
  const [isLoadingOverpass, setIsLoadingOverpass] = useState<boolean>(false);
  const [overpassStatus, setOverpassStatus] = useState<string | null>(null);
  const [showOverpassLayer, setShowOverpassLayer] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);

  // Multi-Source Live Search State (Photon / OSM / NH-58 Registry / TomTom)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchProvider, setSearchProvider] = useState<string | null>(null);
  const searchMarkerRef = useRef<L.Marker | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Live GPS Tracking State
  const [isTrackingUser, setIsTrackingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [trackingInfo, setTrackingInfo] = useState<string | null>(null);
  const userGpsMarkerRef = useRef<L.Marker | null>(null);
  const userGpsCircleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on NH-58 Garhwal corridor
    const map = L.map(mapContainerRef.current, {
      center: [30.26, 78.92],
      zoom: 10,
      zoomControl: false,
      attributionControl: false,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Dark Tactical tile layer with Carto Key (Fixed "API key required" issue)
    const darkTiles = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
      {
        maxZoom: 19,
        subdomains: 'abcd',
        pane: 'tilePane',
      }
    );
    darkTiles.addTo(map);
    baseTileLayerRef.current = darkTiles;

    polylinesLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    weatherLayerGroupRef.current = L.layerGroup().addTo(map);
    overpassLayerGroupRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(mapContainerRef.current);
    requestAnimationFrame(() => map.invalidateSize({ animate: false }));

    return () => {
      resizeObserver.disconnect();
      setMapReady(false);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Base Layer Switch (Carto Dark with Key, TomTom Street Dark, ESRI Satellite, ESRI Topo)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clean up previous base tile layer
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    // Clean up satellite labels if present
    if (satelliteLabelsLayerRef.current) {
      map.removeLayer(satelliteLabelsLayerRef.current);
      satelliteLabelsLayerRef.current = null;
    }

    if (activeBaseLayer === 'satellite') {
      // 1. High-Resolution Satellite Photographic Imagery (ESRI World Imagery)
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          pane: 'tilePane',
        }
      );
      satLayer.addTo(map);
      baseTileLayerRef.current = satLayer;

      // 2. Reference Overlay for roads and place names
      const labelsLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 18,
          pane: 'tilePane',
          opacity: 0.9,
        }
      );
      labelsLayer.addTo(map);
      satelliteLabelsLayerRef.current = labelsLayer;

    } else if (activeBaseLayer === 'topo') {
      // ESRI World Topographic Map
      const topoLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          pane: 'tilePane',
        }
      );
      topoLayer.addTo(map);
      baseTileLayerRef.current = topoLayer;

    } else if (activeBaseLayer === 'tomtom_dark') {
      // TomTom Orbis Street Dark Tiles using TomTom API Key
      const tomtomTiles = L.tileLayer(
        `https://api.tomtom.com/maps/orbis/display/raster/tile/{z}/{x}/{y}?apiVersion=2&style=street-dark&key=${TOMTOM_KEY}`,
        {
          maxZoom: 19,
          pane: 'tilePane',
        }
      );
      tomtomTiles.addTo(map);
      baseTileLayerRef.current = tomtomTiles;

    } else {
      // CartoDB Dark Matter with official Carto Key - Completely fixes "API key required" watermark!
      const darkLayer = L.tileLayer(
        `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`,
        {
          maxZoom: 19,
          subdomains: 'abcd',
          pane: 'tilePane',
        }
      );
      darkLayer.addTo(map);
      baseTileLayerRef.current = darkLayer;
    }
  }, [activeBaseLayer]);

  // TomTom Real-Time Live Traffic Layer Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (showTrafficLayer) {
      if (!tomtomTrafficLayerRef.current) {
        const trafficLayer = L.tileLayer(
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`,
          {
            maxZoom: 19,
            opacity: 0.85,
          }
        );
        trafficLayer.addTo(map);
        tomtomTrafficLayerRef.current = trafficLayer;
      }
    } else {
      if (tomtomTrafficLayerRef.current) {
        map.removeLayer(tomtomTrafficLayerRef.current);
        tomtomTrafficLayerRef.current = null;
      }
    }
  }, [showTrafficLayer]);

  // Robust Multi-Source Geocoding API Callback Search
  const executeSearchApi = async (queryText: string) => {
    const cleanQuery = queryText.trim();
    if (!cleanQuery || cleanQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const res = await fetch(`/api/tomtom/search?query=${encodeURIComponent(cleanQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
        setSearchProvider(data.provider || 'Geospatial Geocoder');
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      console.warn('Geocoding search API failed:', e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (queryText: string) => {
    setSearchQuery(queryText);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!queryText.trim() || queryText.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    searchDebounceRef.current = setTimeout(() => {
      executeSearchApi(queryText);
    }, 280);
  };

  const handleSelectSearchResult = (result: any) => {
    const map = mapInstanceRef.current;
    if (!map || !result.position) return;

    const lat = result.position.lat;
    const lon = result.position.lon;
    const name = result.poi?.name || result.address?.freeformAddress || 'Selected Location';
    const source = result.source || searchProvider || 'Geospatial API';

    // Find nearest NH-58 highway segment to provide safety context
    let nearestSeg: HighwaySegment | null = null;
    let minDistanceKm = 999999;
    segments.forEach((s) => {
      const dLat = s.centerCoord[0] - lat;
      const dLng = s.centerCoord[1] - lon;
      const dDeg = Math.sqrt(dLat * dLat + dLng * dLng);
      const dKm = dDeg * 111.0;
      if (dKm < minDistanceKm) {
        minDistanceKm = dKm;
        nearestSeg = s;
      }
    });

    const nearestTel = nearestSeg ? telemetries.get((nearestSeg as HighwaySegment).id) : null;
    const roundedDistKm = Math.round(minDistanceKm * 10) / 10;

    // Remove old search marker
    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
    }

    const searchIcon = L.divIcon({
      className: 'custom-search-marker',
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500 text-white border-2 border-white shadow-[0_0_18px_rgba(6,182,212,0.9)]">
          <div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60"></div>
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const marker = L.marker([lat, lon], { icon: searchIcon }).addTo(map);

    let riskBadgeHtml = '';
    if (nearestTel) {
      const isUnstable = nearestTel.riskTier === 'UNSTABLE';
      const isMarginal = nearestTel.riskTier === 'MARGINAL';
      const badgeBg = isUnstable ? '#be123c' : isMarginal ? '#b45309' : '#047857';
      const label = isUnstable ? 'HIGH DANGER' : isMarginal ? 'CAUTION' : 'SAFE ROAD';
      riskBadgeHtml = `
        <div style="margin-top: 6px; padding: 6px 8px; border-radius: 8px; background-color: #0f172a; border: 1px solid #334155; font-size: 11px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
            <span style="color: #94a3b8;">Nearest NH-58 Stretch:</span>
            <span style="background: ${badgeBg}; color: white; padding: 1px 6px; border-radius: 9999px; font-weight: bold; font-size: 9px;">${label}</span>
          </div>
          <div style="font-weight: 600; color: #f1f5f9;">${(nearestSeg as any)?.name} (Km ${(nearestSeg as any)?.chainageKm})</div>
          <div style="color: #38bdf8; font-size: 10px; margin-top: 2px;">${roundedDistKm < 1 ? 'Directly on Highway Corridor' : `${roundedDistKm} km from NH-58`}</div>
        </div>
      `;
    }

    const popupHtml = `
      <div style="font-family: system-ui, sans-serif; min-width: 210px; max-width: 270px; color: #0f172a; line-height: 1.35; padding: 2px;">
        <div style="font-weight: 700; color: #0284c7; font-size: 13px; margin-bottom: 2px;">${name}</div>
        <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">${result.address?.freeformAddress || 'Uttarakhand, India'}</div>
        <div style="font-size: 10px; color: #64748b; font-family: monospace;">
          📍 ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E
        </div>
        ${riskBadgeHtml}
        <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between;">
          <span>Source: ${source}</span>
          <span style="color: #0284c7; font-weight: 600;">Live Geocoded</span>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml).openPopup();
    searchMarkerRef.current = marker;
    map.flyTo([lat, lon], 13, { duration: 1.2 });
    setShowSearchResults(false);
  };

  // Live GPS Tracking handler
  const handleToggleGpsTracking = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isTrackingUser) {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (userGpsMarkerRef.current) {
        map.removeLayer(userGpsMarkerRef.current);
        userGpsMarkerRef.current = null;
      }
      if (userGpsCircleRef.current) {
        map.removeLayer(userGpsCircleRef.current);
        userGpsCircleRef.current = null;
      }
      setIsTrackingUser(false);
      setTrackingInfo(null);
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsTrackingUser(true);
    setTrackingInfo('Acquiring live satellite positioning...');

    const onPosSuccess = (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;
      setUserLocation({ lat, lng, accuracy });

      // Find nearest highway segment
      let nearestSeg = segments[0];
      let minDistance = 999999;
      segments.forEach((s) => {
        const dLat = s.centerCoord[0] - lat;
        const dLng = s.centerCoord[1] - lng;
        const d = Math.sqrt(dLat * dLat + dLng * dLng);
        if (d < minDistance) {
          minDistance = d;
          nearestSeg = s;
        }
      });

      const tel = telemetries.get(nearestSeg.id);
      setTrackingInfo(`Live GPS Active: near ${nearestSeg.name} (Km ${nearestSeg.chainageKm}) • Status: ${tel?.riskTier || 'MONITORED'}`);

      // Update or create GPS Marker on map
      if (!userGpsMarkerRef.current) {
        const gpsIcon = L.divIcon({
          className: 'user-live-gps-marker',
          html: `
            <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.9)]">
              <div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></div>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/>
              </svg>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([lat, lng], { icon: gpsIcon }).addTo(map);
        marker.bindPopup(`
          <div class="p-2 text-xs font-sans text-slate-900">
            <div class="font-bold text-blue-600 text-sm">📍 Your Live Position</div>
            <div class="text-slate-600 text-[11px] mt-1">Accuracy: ±${Math.round(accuracy)}m</div>
            <div class="text-[11px] font-semibold text-slate-800 mt-1">Nearest Segment: ${nearestSeg.name} (Km ${nearestSeg.chainageKm})</div>
          </div>
        `);
        userGpsMarkerRef.current = marker;

        const circle = L.circle([lat, lng], {
          radius: Math.max(accuracy, 30),
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);
        userGpsCircleRef.current = circle;

        map.flyTo([lat, lng], 13, { duration: 1.2 });
      } else {
        userGpsMarkerRef.current.setLatLng([lat, lng]);
        if (userGpsCircleRef.current) {
          userGpsCircleRef.current.setLatLng([lat, lng]);
          userGpsCircleRef.current.setRadius(Math.max(accuracy, 30));
        }
      }
    };

    const onPosError = (err: GeolocationPositionError) => {
      console.warn('Geolocation watch error:', err);
      setTrackingInfo('GPS restricted in preview. Using simulated corridor telemetry.');
      // Simulate position along NH-58 near Byasi
      onPosSuccess({
        coords: {
          latitude: 30.1340,
          longitude: 78.3890,
          accuracy: 15,
          altitude: 420,
          altitudeAccuracy: null,
          heading: null,
          speed: 28,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPosSuccess, onPosError, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 10000,
    });
  };


  // Update Segments, Polylines and Markers when telemetries or selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polyGroup = polylinesLayerGroupRef.current;
    const markerGroup = markersLayerGroupRef.current;
    const weatherGroup = weatherLayerGroupRef.current;

    if (!map || !polyGroup || !markerGroup || !weatherGroup) return;

    polyGroup.clearLayers();
    markerGroup.clearLayers();
    weatherGroup.clearLayers();

    // Render Weather Stations
    weatherStations.forEach((ws) => {
      const weatherIcon = L.divIcon({
        className: 'custom-weather-icon',
        html: `
          <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.5)] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
              <path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/>
            </svg>
            <span class="absolute -top-1 -right-1 flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const wsMarker = L.marker([ws.lat, ws.lng], { icon: weatherIcon });
      wsMarker.bindPopup(`
        <div class="p-2 min-w-[200px] text-xs font-mono">
          <div class="font-bold text-cyan-300 border-b border-slate-700 pb-1 flex items-center justify-between">
            <span>${ws.name}</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">${ws.status}</span>
          </div>
          <div class="mt-2 space-y-1 text-slate-300">
            <div>Current Rain: <b class="text-cyan-400">${ws.currentRainRateMmHr} mm/h</b></div>
            <div>24h Total: <b class="text-cyan-400">${ws.accumulated24hMm} mm</b></div>
            <div>Elevation: <b class="text-slate-200">${ws.elevationM} m MSL</b></div>
            <div class="text-[10px] text-slate-400 mt-1">Provider: ${ws.provider}</div>
          </div>
        </div>
      `);
      weatherGroup.addLayer(wsMarker);
    });

    // Render Segments
    segments.forEach((seg) => {
      const tel = telemetries.get(seg.id);
      const isSelected = seg.id === selectedSegmentId;

      let strokeColor = '#10b981'; // STABLE
      let glowColor = 'rgba(16, 185, 129, 0.4)';
      let tierBadgeClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      let friendlyTierName = 'SAFE ROAD';
      let friendlyAdvice = 'Road open & stable';

      if (!tel || tel.riskTier === 'DATA_DEFICIENT') {
        strokeColor = '#a855f7';
        glowColor = 'rgba(168, 85, 247, 0.4)';
        tierBadgeClass = 'bg-purple-950/80 text-purple-300 border-purple-500/40';
        friendlyTierName = 'UNVERIFIED';
        friendlyAdvice = 'Needs physical patrol inspection';
      } else if (tel.riskTier === 'UNSTABLE') {
        strokeColor = '#f43f5e';
        glowColor = 'rgba(244, 63, 94, 0.6)';
        tierBadgeClass = 'bg-rose-950/80 text-rose-300 border-rose-500/40 animate-pulse';
        friendlyTierName = 'HIGH DANGER';
        friendlyAdvice = 'High risk of landslide collapse: Avoid travel';
      } else if (tel.riskTier === 'MARGINAL') {
        strokeColor = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.4)';
        tierBadgeClass = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
        friendlyTierName = 'CAUTION';
        friendlyAdvice = 'Watch for falling rocks, drive slowly';
      }

      // Outer glow line
      const glowPoly = L.polyline(seg.coordinates, {
        color: strokeColor,
        weight: isSelected ? 12 : (tel?.riskTier === 'UNSTABLE' ? 10 : 7),
        opacity: 0.35,
        lineCap: 'round',
      });
      polyGroup.addLayer(glowPoly);

      // Route Corridor Halo if segment is along selected trip route
      const isOnActiveRoute = 
        routeMinKm !== undefined && 
        routeMaxKm !== undefined && 
        seg.chainageKm >= routeMinKm - 2.0 && 
        seg.chainageKm <= routeMaxKm + 2.0;

      if (isOnActiveRoute) {
        const routeHalo = L.polyline(seg.coordinates, {
          color: '#06b6d4',
          weight: 16,
          opacity: 0.22,
          lineCap: 'round',
        });
        polyGroup.addLayer(routeHalo);
      }

      // Core crisp line
      const corePoly = L.polyline(seg.coordinates, {
        color: isSelected ? '#38bdf8' : strokeColor,
        weight: isSelected ? 6 : (tel?.riskTier === 'UNSTABLE' ? 5 : 3.5),
        opacity: 0.95,
        lineCap: 'round',
      });

      corePoly.on('click', () => {
        onSelectSegment(seg.id);
      });

      // User-friendly Interactive Popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-2.5 min-w-[250px] text-xs font-sans';
      popupContent.innerHTML = `
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
          <div>
            <div class="font-bold text-slate-100 text-sm">${seg.name}</div>
            <div class="text-[11px] text-slate-400">NH-58 • Km ${seg.chainageKm}</div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierBadgeClass}">
            ${friendlyTierName}
          </span>
        </div>

        <div class="mb-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-200 text-xs">
          <div class="text-[10px] text-slate-400 font-semibold mb-0.5">Travel Advisory:</div>
          <div>${friendlyAdvice}</div>
        </div>

        <div class="grid grid-cols-2 gap-2 my-2 py-1.5 px-2 bg-slate-950/60 rounded border border-slate-800 text-[11px]">
          <div>
            <div class="text-slate-400 text-[10px]">Mountain Slope</div>
            <div class="text-slate-100 font-semibold">${seg.slopeBeta}° (${seg.slopeBeta > 45 ? 'Steep Cliff' : 'Moderate Incline'})</div>
          </div>
          <div>
            <div class="text-slate-400 text-[10px]">Rain / Ground Water</div>
            <div class="font-semibold text-cyan-300">
              ${tel ? `${tel.waterTableHeightM > 1.5 ? 'Heavy Waterlogged' : 'Moist Ground'}` : '--'}
            </div>
          </div>
        </div>

        <button id="popup-inspect-btn-${seg.id}" class="w-full py-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm">
          <span>View Road Safety Details &rarr;</span>
        </button>
      `;

      // Attach button listener after DOM render in popup
      corePoly.bindPopup(popupContent);
      corePoly.on('popupopen', () => {
        const btn = document.getElementById(`popup-inspect-btn-${seg.id}`);
        if (btn) {
          btn.onclick = () => onSelectSegment(seg.id);
        }
      });

      polyGroup.addLayer(corePoly);

      // If UNSTABLE or DATA DEFICIENT, add prominent station marker
      if (tel?.riskTier === 'UNSTABLE' || tel?.riskTier === 'DATA_DEFICIENT' || isSelected) {
        const markerIcon = L.divIcon({
          className: 'custom-segment-marker',
          html: `
            <div class="relative flex items-center justify-center w-5 h-5 rounded-full ${
              isSelected
                ? 'bg-sky-500 text-white ring-4 ring-sky-400/40 scale-125'
                : tel?.riskTier === 'UNSTABLE'
                ? 'bg-rose-500 text-white ring-4 ring-rose-500/40 animate-pulse'
                : 'bg-purple-600 text-white ring-2 ring-purple-500/30'
            } shadow-lg cursor-pointer">
              <span class="text-[9px] font-bold font-mono">
                ${tel?.riskTier === 'UNSTABLE' ? '!' : tel?.riskTier === 'DATA_DEFICIENT' ? '?' : '•'}
              </span>
            </div>
          `,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        const marker = L.marker(seg.centerCoord, { icon: markerIcon });
        marker.on('click', () => {
          onSelectSegment(seg.id);
          corePoly.openPopup();
        });
        markerGroup.addLayer(marker);
      }
    });
  }, [mapReady, segments, telemetries, selectedSegmentId, onSelectSegment, weatherStations, routeMinKm, routeMaxKm]);

  // Fly to selected segment
  useEffect(() => {
    if (!selectedSegmentId || !mapInstanceRef.current) return;
    const seg = segments.find((s) => s.id === selectedSegmentId);
    if (seg) {
      mapInstanceRef.current.flyTo(seg.centerCoord, 13, { duration: 1.2 });
    }
  }, [selectedSegmentId, segments]);

  // Fetch live OpenStreetMap data from public Overpass API (https://overpass-api.de/api/interpreter)
  const loadOverpassData = async () => {
    setIsLoadingOverpass(true);
    setOverpassStatus('Querying overpass-api.de/api/interpreter...');
    try {
      const res = await fetchOverpassRoadData();
      setOverpassFeatures(res.features);
      setOverpassStatus(`Loaded ${res.count} live OSM features from overpass-api.de`);
    } catch (err: any) {
      console.warn('Overpass public API query error:', err);
      setOverpassStatus('Public Overpass API temporarily rate-limited or idle');
    } finally {
      setIsLoadingOverpass(false);
    }
  };

  useEffect(() => {
    loadOverpassData();
  }, []);

  // Render Overpass OSM features onto Leaflet Map
  useEffect(() => {
    const layer = overpassLayerGroupRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showOverpassLayer || overpassFeatures.length === 0) return;

    overpassFeatures.forEach((feat) => {
      if (feat.type === 'highway' && feat.coordinates.length > 1) {
        // Render highway way line
        const poly = L.polyline(feat.coordinates, {
          color: '#38bdf8',
          weight: 3.5,
          opacity: 0.7,
          dashArray: '5, 8',
        });

        poly.bindTooltip(
          `<div><strong>${feat.name}</strong><br/><span style="font-size:10px;color:#94a3b8">OSM Public Way (overpass-api.de)</span></div>`,
          { sticky: true }
        );

        poly.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; max-width: 220px; line-height: 1.4;">
            <div style="font-weight: bold; color: #0284c7; font-size: 13px;">${feat.name}</div>
            <div style="margin: 4px 0; color: #334155; font-size: 11px;">${feat.details}</div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b;">
              Source: OpenStreetMap via overpass-api.de/api/interpreter
            </div>
          </div>
        `);
        layer.addLayer(poly);
      } else if (feat.center) {
        // Render Emergency & Safety POI (Hospital / Police / Fuel)
        const isHosp = feat.type === 'hospital';
        const isPol = feat.type === 'police';
        const bgColor = isHosp ? '#ef4444' : isPol ? '#2563eb' : '#f59e0b';
        const symbol = isHosp ? '+' : isPol ? '👮' : '⛽';

        const poiIcon = L.divIcon({
          className: 'custom-overpass-poi-marker',
          html: `
            <div style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background-color:${bgColor};color:#ffffff;font-size:11px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.5);border:2px solid #ffffff;cursor:pointer;">
              ${symbol}
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const m = L.marker(feat.center, { icon: poiIcon });
        m.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #0f172a; max-width: 220px; line-height: 1.4;">
            <div style="font-weight: bold; color: ${bgColor}; font-size: 13px;">${feat.name}</div>
            <div style="margin: 4px 0; color: #334155; font-size: 11px;">${feat.details}</div>
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b;">
              OSM ${feat.type.toUpperCase()} • overpass-api.de
            </div>
          </div>
        `);
        layer.addLayer(m);
      }
    });
  }, [overpassFeatures, showOverpassLayer]);

  const handleFitAll = () => {
    if (!mapInstanceRef.current || segments.length === 0) return;
    const allCoords = segments.flatMap((s) => s.coordinates);
    const bounds = L.latLngBounds(allCoords);
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
  };

  return (
    <div className="relative w-full h-[520px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-slate-950/80 backdrop-blur-xl transition-all duration-300">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Control Bar (Positioned Under Top Search Row - Zero Overlap) with Apple Glass Styling */}
      <div className="map-glass-toolbar absolute top-3 left-3 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] max-w-[calc(100%-24px)] overflow-x-auto">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-300 shrink-0">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-semibold">Style:</span>
        </div>

        <button
          id="map-style-dark-btn"
          type="button"
          onClick={() => setActiveBaseLayer('dark')}
          className={`px-2.5 py-1 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
            activeBaseLayer === 'dark'
              ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
          title="Carto Dark Matter (Key Verified)"
        >
          Carto Dark
        </button>

        <button
          id="map-style-tomtom-btn"
          type="button"
          onClick={() => setActiveBaseLayer('tomtom_dark')}
          className={`px-2.5 py-1 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
            activeBaseLayer === 'tomtom_dark'
              ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)] font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
          title="TomTom Street Dark (Key Verified)"
        >
          TomTom Dark
        </button>

        <button
          id="map-style-satellite-btn"
          type="button"
          onClick={() => setActiveBaseLayer('satellite')}
          className={`px-2.5 py-1 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
            activeBaseLayer === 'satellite'
              ? 'bg-sky-500/25 text-sky-200 border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.25)] font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
          title="High-resolution ESRI satellite photography with highway & town overlays"
        >
          Satellite
        </button>

        <button
          id="map-style-topo-btn"
          type="button"
          onClick={() => setActiveBaseLayer('topo')}
          className={`px-2.5 py-1 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
            activeBaseLayer === 'topo'
              ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.25)] font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
          title="ESRI World Topographic Map with contour elevations & mountain passes"
        >
          Topo
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block shrink-0" />

        {/* Live TomTom Traffic Flow Overlay Toggle */}
        <button
          id="tomtom-live-traffic-btn"
          type="button"
          onClick={() => setShowTrafficLayer(!showTrafficLayer)}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
            showTrafficLayer
              ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-[0_0_10px_rgba(245,158,11,0.3)] font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
          title="Live TomTom Traffic Flow Layer (Real-Time Congestion)"
        >
          <Car className="w-3.5 h-3.5 text-amber-400" />
          <span>Traffic: {showTrafficLayer ? 'ON' : 'OFF'}</span>
        </button>

        {/* Live Highway GPS Tracking Toggle */}
        <button
          id="map-gps-track-btn"
          type="button"
          onClick={handleToggleGpsTracking}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
            isTrackingUser
              ? 'bg-blue-600 text-white shadow-[0_0_14px_rgba(37,99,235,0.6)] font-bold animate-pulse'
              : 'bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-500/30'
          }`}
          title="Live Vehicle / User GPS Highway Tracker"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${isTrackingUser ? 'animate-spin text-white' : 'text-blue-400'}`} />
          <span>{isTrackingUser ? 'Tracking Active' : 'Track GPS'}</span>
        </button>

        <button
          id="map-fit-corridor-btn"
          type="button"
          onClick={handleFitAll}
          title="Fit full NH-58 corridor in view"
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-xl text-slate-300 hover:text-cyan-300 hover:bg-white/10 border border-white/5 transition-all duration-200 cursor-pointer shrink-0"
        >
          <Maximize2 className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline">Fit</span>
        </button>

        {/* Public Overpass API Toggle */}
        <button
          id="overpass-api-layer-toggle-btn"
          type="button"
          onClick={() => setShowOverpassLayer(!showOverpassLayer)}
          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer shrink-0 ${
            showOverpassLayer
              ? 'bg-sky-500/20 text-sky-200 border border-sky-400/35 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
          title="Toggle OpenStreetMap POIs (Hospitals, Police, Fuel) via overpass-api.de"
        >
          <Radio className={`w-3 h-3 ${isLoadingOverpass ? 'animate-spin text-amber-400' : 'text-sky-400'}`} />
          <span className="hidden md:inline">OSM POIs:</span>
          <span>{overpassFeatures.length > 0 ? `${overpassFeatures.length}` : 'OSM'}</span>
        </button>
      </div>

      {/* Geocoding Live Search Box (Top Right, Non-Overlapping) */}
      <div className="absolute top-14 right-3 z-30 w-72 sm:w-84 max-w-[calc(100%-24px)]">
        <div className="relative flex items-center rounded-2xl bg-slate-900/90 hover:bg-slate-900/95 focus-within:bg-slate-900 backdrop-blur-2xl border border-white/20 focus-within:border-cyan-400/80 focus-within:ring-2 focus-within:ring-cyan-500/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] px-3 py-1.5 transition-all duration-200">
          <Search className="w-3.5 h-3.5 text-cyan-400 mr-2 shrink-0" />
          <input
            id="map-place-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                executeSearchApi(searchQuery);
              }
            }}
            onFocus={() => { if (searchResults.length > 0 || !searchQuery) setShowSearchResults(true); }}
            placeholder="Search place, town or landslide zone..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearchResults(false); }}
              className="p-1 hover:text-white text-slate-400 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {isSearching && (
            <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin ml-1.5 shrink-0" />
          )}
        </div>

        {/* Geocoded Autocomplete Dropdown */}
        {showSearchResults && (
          <div className="absolute left-0 right-0 mt-1.5 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_16px_36px_rgba(0,0,0,0.7)] overflow-hidden max-h-64 overflow-y-auto divide-y divide-white/10 z-30">
            {searchResults.length > 0 ? (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-cyan-400 bg-cyan-950/40 flex items-center justify-between">
                  <span>PLACES FOUND ({searchResults.length})</span>
                  <span className="text-slate-400 text-[9px] font-mono">{searchProvider}</span>
                </div>
                {searchResults.map((res: any, idx: number) => {
                  const name = res.poi?.name || res.address?.freeformAddress || 'Place';
                  const subtitle = [res.address?.municipality, res.address?.countrySubdivision].filter(Boolean).join(', ');
                  const category = res.poi?.category;
                  return (
                    <button
                      key={res.id || idx}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-cyan-950/60 transition-colors flex items-start gap-2.5 cursor-pointer group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-slate-100 truncate group-hover:text-cyan-200">{name}</span>
                          {category && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium whitespace-nowrap">
                              {category}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{subtitle || 'Uttarakhand Highway Point'}</div>
                      </div>
                    </button>
                  );
                })}
              </>
            ) : searchQuery.trim().length >= 2 && !isSearching ? (
              <div className="px-4 py-4 text-center text-xs text-slate-400">
                <p>No places found for "{searchQuery}"</p>
                <p className="text-[10px] text-slate-500 mt-1">Try "Rishikesh", "Devprayag", "Srinagar", or "Joshimath"</p>
              </div>
            ) : !searchQuery ? (
              <div className="p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Highway Jumps</div>
                <div className="flex flex-wrap gap-1.5">
                  {['Rishikesh', 'Totaghati', 'Devprayag', 'Srinagar', 'Rudraprayag', 'Karnaprayag', 'Joshimath', 'Badrinath'].map((wpt) => (
                    <button
                      key={wpt}
                      type="button"
                      onClick={() => {
                        setSearchQuery(wpt);
                        executeSearchApi(wpt);
                      }}
                      className="px-2 py-1 text-[11px] rounded-lg bg-slate-800/80 hover:bg-cyan-950 hover:text-cyan-200 border border-white/10 text-slate-300 transition-colors cursor-pointer"
                    >
                      {wpt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Live Tracking HUD Banner (if user GPS active) */}
      {trackingInfo && (
        <div className="absolute top-16 left-3 z-10 max-w-sm px-3.5 py-2 rounded-2xl bg-blue-950/85 backdrop-blur-2xl border border-blue-400/40 shadow-xl text-xs text-blue-100 flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping shrink-0" />
          <span className="font-medium">{trackingInfo}</span>
        </div>
      )}


      {/* Map Legend Overlay (Bottom Right) with Apple Glass Effect */}
      {showLegend ? (
        <div 
          id="map-legend-overlay"
          className="absolute bottom-3 right-3 z-10 p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] max-w-xs text-[11px] transition-all duration-200"
        >
          <div className="font-semibold text-slate-200 border-b border-white/10 pb-1.5 mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span>Slope Stability Hazard Tiers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-cyan-400 font-mono hidden sm:inline">NH-58</span>
              <button
                id="close-map-legend-btn"
                type="button"
                onClick={() => setShowLegend(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Close legend"
                aria-label="Close legend tab"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
                <span className="text-rose-300 font-semibold">UNSTABLE</span>
              </div>
              <span className="text-slate-400">FoS &lt; 1.00 (Failure)</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-pulse" />
                <span className="text-rose-300 font-semibold">HIGH DANGER</span>
              </div>
              <span className="text-rose-400 font-bold">Avoid Travel</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
                <span className="text-amber-300 font-semibold">CAUTION</span>
              </div>
              <span className="text-amber-400">Drive Slowly</span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span className="text-emerald-300 font-semibold">SAFE ROAD</span>
              </div>
              <span className="text-emerald-400">Clear Road</span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1.5 rounded-full bg-purple-500 shadow-[0_0_6px_#a855f7]" />
                <span className="text-purple-300 font-semibold">UNVERIFIED</span>
              </div>
              <span className="text-slate-400">Check Required</span>
            </div>
          </div>

          {/* Public Overpass OSM Layer Legend Items */}
          <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1 text-[10px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-sky-300">
                <span className="w-3 h-0.5 bg-sky-400 border-t border-dashed border-sky-300" />
                <span>OSM Highway Line</span>
              </span>
              <span className="text-[9px] text-slate-500">overpass-api.de</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-red-300">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                <span>Emergency Hospital / Police / Fuel</span>
              </span>
              <span className="text-[9px] text-slate-500">OSM POI</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>Weather Station AWS Node</span>
              </span>
              <span className="text-[9px] text-slate-500">IMD AWS</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          id="reopen-map-legend-btn"
          type="button"
          onClick={() => setShowLegend(true)}
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800/90 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] text-xs text-slate-200 hover:text-cyan-300 transition-all duration-200 cursor-pointer"
          title="Open Map Hazard Legend"
        >
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-medium">Map Legend</span>
        </button>
      )}
    </div>
  );
};
