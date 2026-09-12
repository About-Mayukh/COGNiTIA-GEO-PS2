import React, { useState, useMemo, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  LocateFixed, 
  ArrowRight, 
  ArrowLeftRight, 
  CloudRain, 
  Zap, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Eye, 
  Car, 
  Compass, 
  Info, 
  Clock, 
  Waves, 
  Mountain, 
  AlertOctagon, 
  Sparkles,
  X,
  Radio,
  Check,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { HighwaySegment, SegmentRiskTelemetry, IncidentFeedbackLog } from '../types';
import { fetchLiveRainfallData } from '../utils/rainfallService';

export interface RouteWaypoint {
  name: string;
  chainageKm: number;
  lat: number;
  lng: number;
  elevationM: number;
  type: 'TOWN' | 'JUNCTION' | 'PASS' | 'DESTINATION';
  description?: string;
  hasHistoricalSlides: boolean;
}

export const CORRIDOR_WAYPOINTS: RouteWaypoint[] = [
  { name: 'Rishikesh (Triveni Ghat / Bypass)', chainageKm: 0.0, lat: 30.1080, lng: 78.2980, elevationM: 360, type: 'TOWN', hasHistoricalSlides: false, description: 'Corridor origin & foothill base' },
  { name: 'Shivpuri Rapid Zone', chainageKm: 18.0, lat: 30.1340, lng: 78.3890, elevationM: 420, type: 'JUNCTION', hasHistoricalSlides: false, description: 'River valley base' },
  { name: 'Byasi Gorge Escarpment', chainageKm: 42.25, lat: 30.1258, lng: 78.4428, elevationM: 520, type: 'JUNCTION', hasHistoricalSlides: true, description: 'Steep quartzite cliff cut' },
  { name: 'Totaghati Massive Cliff', chainageKm: 48.75, lat: 30.1428, lng: 78.5042, elevationM: 610, type: 'PASS', hasHistoricalSlides: true, description: 'High-risk jointed rockfall zone' },
  { name: 'Kaudiyala Sector', chainageKm: 56.50, lat: 30.1595, lng: 78.5705, elevationM: 685, type: 'JUNCTION', hasHistoricalSlides: true, description: 'Talus debris scree slope' },
  { name: 'Devprayag (Sangam)', chainageKm: 68.25, lat: 30.1470, lng: 78.6015, elevationM: 740, type: 'TOWN', hasHistoricalSlides: true, description: 'Alaknanda & Bhagirathi confluence' },
  { name: 'Maletha Terraces (Srinagar Valley)', chainageKm: 79.0, lat: 30.2001, lng: 78.7145, elevationM: 810, type: 'JUNCTION', hasHistoricalSlides: false, description: 'Gentle agricultural river terraces' },
  { name: 'Srinagar Town Central', chainageKm: 88.0, lat: 30.2220, lng: 78.7850, elevationM: 560, type: 'TOWN', hasHistoricalSlides: false, description: 'Wide valley hub with hospital & BRO base' },
  { name: 'Sirobagarh Chronic Fault Zone', chainageKm: 98.50, lat: 30.2429, lng: 78.8944, elevationM: 920, type: 'PASS', hasHistoricalSlides: true, description: 'Srinagar thrust shear zone (high hazard)' },
  { name: 'Kaliasaur Landslide Complex', chainageKm: 112.75, lat: 30.2698, lng: 78.9665, elevationM: 980, type: 'PASS', hasHistoricalSlides: true, description: 'Fractured quartzite dipslope' },
  { name: 'Rudraprayag (Mandakini Sangam)', chainageKm: 124.25, lat: 30.2872, lng: 78.9835, elevationM: 1040, type: 'TOWN', hasHistoricalSlides: true, description: 'Key transit junction for Kedarnath & Badrinath' },
  { name: 'Narkota Deep Ravine', chainageKm: 136.50, lat: 30.3028, lng: 79.0365, elevationM: 1120, type: 'PASS', hasHistoricalSlides: true, description: 'Colluvium slope over granitic gneiss' },
  { name: 'Karnaprayag Confluence', chainageKm: 148.0, lat: 30.2620, lng: 79.2180, elevationM: 1180, type: 'TOWN', hasHistoricalSlides: false, description: 'Pindar river confluence' },
  { name: 'Chamoli / Pipalkoti Spur', chainageKm: 158.0, lat: 30.4298, lng: 79.3345, elevationM: 1380, type: 'TOWN', hasHistoricalSlides: true, description: 'Dolomitic gorge cut' },
  { name: 'Gulabkoti Fragile Escarpment', chainageKm: 174.25, lat: 30.5138, lng: 79.5005, elevationM: 1540, type: 'PASS', hasHistoricalSlides: true, description: 'Mica schist weathered gouge' },
  { name: 'Joshimath High Mountain Hub', chainageKm: 188.0, lat: 30.5578, lng: 79.5665, elevationM: 1890, type: 'TOWN', hasHistoricalSlides: true, description: 'High altitude mountain town' },
  { name: 'Govindghat Valley Pass', chainageKm: 202.0, lat: 30.6250, lng: 79.5960, elevationM: 2050, type: 'JUNCTION', hasHistoricalSlides: false, description: 'Valley river canyon' },
  { name: 'Badrinath Dham (Final Terminus)', chainageKm: 215.0, lat: 30.7433, lng: 79.4938, elevationM: 3100, type: 'DESTINATION', hasHistoricalSlides: false, description: 'Glacial valley shrine terminus' },
];

interface RouteTripSafetyPlannerProps {
  segments: HighwaySegment[];
  telemetries: Map<string, SegmentRiskTelemetry>;
  incidents: IncidentFeedbackLog[];
  rain1h: number;
  rain24h: number;
  onSelectSegment: (id: string) => void;
  onFocusRouteBounds?: (minKm: number, maxKm: number) => void;
  userGps?: { lat: number; lng: number };
}

export const RouteTripSafetyPlanner: React.FC<RouteTripSafetyPlannerProps> = ({
  segments,
  telemetries,
  incidents,
  rain1h,
  rain24h,
  onSelectSegment,
  onFocusRouteBounds,
  userGps,
}) => {
  // Origin & Destination state (Default: User's location at Rishikesh Km 0.0 to Badrinath Km 215.0)
  const [fromLocation, setFromLocation] = useState<string>('My Location (Rishikesh Km 0.0)');
  const [fromKm, setFromKm] = useState<number>(0.0);
  const [toLocation, setToLocation] = useState<string>('Badrinath Dham (Km 215)');
  const [toKm, setToKm] = useState<number>(215.0);
  const [isLocatingUser, setIsLocatingUser] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState<boolean>(false);
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCheckpointName, setSelectedCheckpointName] = useState<string>('Rishikesh (Km 0.0)');
  const [fromCoords, setFromCoords] = useState<{ lat: number; lng: number } | null>(userGps || null);
  const [toCoords, setToCoords] = useState<{ lat: number; lng: number } | null>(CORRIDOR_WAYPOINTS[CORRIDOR_WAYPOINTS.length - 1] ? { lat: 30.7433, lng: 79.4938 } : null);
  const [fromSearch, setFromSearch] = useState('');
  const [toSearch, setToSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchTarget, setSearchTarget] = useState<'from' | 'to' | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [routeWeather, setRouteWeather] = useState<{ rain1h: number; rain24h: number; provider: string } | null>(null);
  // User controlled minimization state: minimized by default; click "More" to expand full directives & telemetry
  const [isHazardInfoExpanded, setIsHazardInfoExpanded] = useState<boolean>(false);
  const [isWeatherInfoExpanded, setIsWeatherInfoExpanded] = useState<boolean>(false);

  // Attempt gentle browser geolocation on initial mount
  useEffect(() => {
    if (userGps) {
      setFromCoords(userGps);
      setFromLocation(`Current location (${userGps.lat.toFixed(4)}, ${userGps.lng.toFixed(4)})`);
    }
  }, [userGps]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setDetectedCoords({ lat: userLat, lng: userLng });

          // Find closest waypoint along NH-58 corridor
          let closestWp = CORRIDOR_WAYPOINTS[0];
          let minDist = 999999;

          CORRIDOR_WAYPOINTS.forEach((wp) => {
            const dLat = wp.lat - userLat;
            const dLng = wp.lng - userLng;
            const dist = Math.sqrt(dLat * dLat + dLng * dLng);
            if (dist < minDist) {
              minDist = dist;
              closestWp = wp;
            }
          });

          // If within ~1.5 degrees (Garhwal region), snap to nearest waypoint
          if (minDist < 1.5) {
            setFromLocation(`My GPS: ${closestWp.name} (Km ${closestWp.chainageKm})`);
            setFromKm(closestWp.chainageKm);
            setSelectedCheckpointName(closestWp.name);
            setGpsStatus(`GPS active • Snapped to nearest highway point: ${closestWp.name}`);
          } else {
            setFromLocation(`My Location (Rishikesh Km 0.0)`);
            setFromKm(0.0);
            setSelectedCheckpointName('Rishikesh (Km 0.0)');
            setGpsStatus(`GPS detected (${userLat.toFixed(2)}°N, ${userLng.toFixed(2)}°E) • Defaulted to corridor start`);
          }
        },
        () => {
          // Geolocation declined or blocked in iframe, keep friendly default
          setGpsStatus('Corridor Entry: Rishikesh (Km 0.0) • Click GPS button to choose checkpoint');
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
      );
    }
  }, []);

  const searchPlaces = async (query: string, target: 'from' | 'to') => {
    setSearchTarget(target);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search/places?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchPlace = (result: any) => {
    const lat = Number(result.position?.lat);
    const lng = Number(result.position?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const nearest = CORRIDOR_WAYPOINTS.reduce((best, waypoint) => {
      const bestDistance = Math.hypot(best.lat - lat, best.lng - lng);
      const currentDistance = Math.hypot(waypoint.lat - lat, waypoint.lng - lng);
      return currentDistance < bestDistance ? waypoint : best;
    }, CORRIDOR_WAYPOINTS[0]);
    const name = result.poi?.name || result.address?.freeformAddress || 'Selected location';
    if (searchTarget === 'from') {
      setFromCoords({ lat, lng });
      setFromLocation(name);
      setFromKm(nearest.chainageKm);
    } else {
      setToCoords({ lat, lng });
      setToLocation(name);
      setToKm(nearest.chainageKm);
    }
    setSearchResults([]);
    setSearchTarget(null);
  };

  const handleUseCurrentGPS = () => {
    // 1. Immediately open the interactive GPS modal for instant user feedback
    setIsGpsModalOpen(true);
    setIsLocatingUser(true);
    setGpsStatus('Requesting device GPS satellite lock...');

    if (!('geolocation' in navigator)) {
      setIsLocatingUser(false);
      setGpsStatus('Geolocation not supported by this browser. Choose your checkpoint below:');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setDetectedCoords({ lat: userLat, lng: userLng });

        let closestWp = CORRIDOR_WAYPOINTS[0];
        let minDist = 999999;
        CORRIDOR_WAYPOINTS.forEach((wp) => {
          const dLat = wp.lat - userLat;
          const dLng = wp.lng - userLng;
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < minDist) {
            minDist = dist;
            closestWp = wp;
          }
        });

        if (minDist < 1.5) {
          setFromLocation(`My GPS: ${closestWp.name} (Km ${closestWp.chainageKm})`);
          setFromKm(closestWp.chainageKm);
          setSelectedCheckpointName(closestWp.name);
          setGpsStatus(`GPS Locked (${userLat.toFixed(4)}°N, ${userLng.toFixed(4)}°E) • Snapped to ${closestWp.name}`);
          if (onFocusRouteBounds) {
            onFocusRouteBounds(Math.min(closestWp.chainageKm, toKm), Math.max(closestWp.chainageKm, toKm));
          }
        } else {
          setGpsStatus(`GPS detected at ${userLat.toFixed(2)}°N, ${userLng.toFixed(2)}°E (Outside NH-58 corridor). Please select your highway starting checkpoint below:`);
        }
      },
      (err) => {
        setIsLocatingUser(false);
        setGpsStatus(`Browser GPS restricted in preview (${err.message || 'permission needed'}). Select your starting checkpoint below or simulate live vehicle GPS:`);
      },
      { enableHighAccuracy: false, timeout: 3500, maximumAge: 60000 }
    );
  };

  const handleSelectCheckpoint = (wp: RouteWaypoint) => {
    setFromKm(wp.chainageKm);
    setFromLocation(`My Location (${wp.name} - Km ${wp.chainageKm})`);
    setSelectedCheckpointName(wp.name);
    setGpsStatus(`Origin set to ${wp.name} [Km ${wp.chainageKm}]`);
    setIsGpsModalOpen(false);
    if (onFocusRouteBounds) {
      onFocusRouteBounds(Math.min(wp.chainageKm, toKm), Math.max(wp.chainageKm, toKm));
    }
  };

  const handleSimulateMovingGps = () => {
    // Pick next checkpoint along corridor
    const testPoints = [
      CORRIDOR_WAYPOINTS[2], // Byasi (Km 42.25)
      CORRIDOR_WAYPOINTS[3], // Totaghati (Km 48.75)
      CORRIDOR_WAYPOINTS[4], // Devprayag (Km 68.2)
      CORRIDOR_WAYPOINTS[6], // Srinagar (Km 88.0)
      CORRIDOR_WAYPOINTS[7], // Sirobagarh (Km 98.5)
      CORRIDOR_WAYPOINTS[8], // Rudraprayag (Km 124.25)
    ];
    const nextPoint = testPoints.find((p) => p && Math.abs(p.chainageKm - fromKm) > 8) || testPoints[0];
    if (nextPoint) {
      handleSelectCheckpoint(nextPoint);
      setGpsStatus(`🚗 Live Vehicle GPS Simulation: Locked at ${nextPoint.name} [Km ${nextPoint.chainageKm}]`);
    }
  };

  const handleSwapRoute = () => {
    const tempLoc = fromLocation;
    const tempKm = fromKm;
    setFromLocation(toLocation);
    setFromKm(toKm);
    setToLocation(tempLoc);
    setToKm(tempKm);
    if (onFocusRouteBounds) {
      onFocusRouteBounds(Math.min(tempKm, toKm), Math.max(tempKm, toKm));
    }
  };

  // Calculate Route Geometry & Segments in Range
  const minKm = Math.min(fromKm, toKm);
  const maxKm = Math.max(fromKm, toKm);
  const distanceKm = Math.max(1, Math.round(Math.abs(toKm - fromKm) * 10) / 10);
  const estimatedDriveTimeHours = Math.round((distanceKm / 28) * 10) / 10; // ~28 km/h mountain speed

  // TomTom Real-Time Routing State
  const [tomtomRoute, setTomtomRoute] = useState<{
    distanceKm: number;
    travelTimeMin: number;
    trafficDelayMin: number;
    provider: string;
  } | null>(null);
  const [isLoadingTomtomRoute, setIsLoadingTomtomRoute] = useState(false);

  useEffect(() => {
    const fromWp = fromCoords || CORRIDOR_WAYPOINTS.find((w) => Math.abs(w.chainageKm - fromKm) < 0.1) || CORRIDOR_WAYPOINTS[0];
    const toWp = toCoords || CORRIDOR_WAYPOINTS.find((w) => Math.abs(w.chainageKm - toKm) < 0.1) || CORRIDOR_WAYPOINTS[CORRIDOR_WAYPOINTS.length - 1];

    if (!fromWp || !toWp || fromWp === toWp) return;

    let isMounted = true;
    setIsLoadingTomtomRoute(true);

    fetch(`/api/tomtom/route?startLat=${fromWp.lat}&startLng=${fromWp.lng}&endLat=${toWp.lat}&endLng=${toWp.lng}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setTomtomRoute({
            distanceKm: data.distanceKm,
            travelTimeMin: data.travelTimeMin,
            trafficDelayMin: data.trafficDelayMin,
            provider: data.provider || 'TomTom Routing & Traffic API',
          });
        }
      })
      .catch((err) => {
        console.warn('TomTom route query error:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTomtomRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fromKm, toKm, fromCoords, toCoords]);

  useEffect(() => {
    const lat = ((fromCoords || { lat: 30.2429 }).lat + (toCoords || { lat: 30.7433 }).lat) / 2;
    const lng = ((fromCoords || { lng: 78.8944 }).lng + (toCoords || { lng: 79.4938 }).lng) / 2;
    fetchLiveRainfallData(lat, lng).then((weather) => {
      setRouteWeather({ rain1h: weather.rain1hMm, rain24h: weather.rain24hMm, provider: weather.provider });
    }).catch(() => setRouteWeather(null));
  }, [fromCoords, toCoords]);


  // Segments traversed along this specific route
  const segmentsOnRoute = useMemo(() => {
    return segments.filter((s) => s.chainageKm >= minKm - 2.0 && s.chainageKm <= maxKm + 2.0);
  }, [segments, minKm, maxKm]);

  // Waypoints on this route
  const waypointsOnRoute = useMemo(() => {
    return CORRIDOR_WAYPOINTS.filter((wp) => wp.chainageKm >= minKm && wp.chainageKm <= maxKm);
  }, [minKm, maxKm]);

  // Calculate Landslide Criteria according to USER REQUEST:
  // "if there is any land slide in past or posibility then of land slide then show it other wise show rain fall and thunder only"
  const pastLandslidesOnRoute = useMemo(() => {
    // 1. Segments with historicalSlideCount > 0
    const historicalSlidesTotal = segmentsOnRoute.reduce((acc, s) => acc + (s.historicalSlideCount || 0), 0);
    // 2. Confirmed logged incidents on this route
    const confirmedIncidentLogs = incidents.filter(
      (inc) => inc.validationType === 'CONFIRMED_LANDSLIDE' && inc.chainageKm >= minKm && inc.chainageKm <= maxKm
    );
    // 3. Waypoints with documented slides
    const waypointsWithSlides = waypointsOnRoute.filter((wp) => wp.hasHistoricalSlides);

    return {
      totalCount: historicalSlidesTotal + confirmedIncidentLogs.length,
      hasHistoricalSlides: historicalSlidesTotal > 0 || confirmedIncidentLogs.length > 0 || waypointsWithSlides.length > 0,
      confirmedIncidents: confirmedIncidentLogs,
    };
  }, [segmentsOnRoute, incidents, waypointsOnRoute, minKm, maxKm]);

  const activeLandslidePossibility = useMemo(() => {
    // Segments with UNSTABLE or MARGINAL risk tier
    const criticalSegments = segmentsOnRoute
      .map((seg) => ({
        seg,
        tel: telemetries.get(seg.id),
      }))
      .filter((item) => item.tel && (item.tel.riskTier === 'UNSTABLE' || item.tel.riskTier === 'MARGINAL'));

    const unstableCount = criticalSegments.filter((item) => item.tel?.riskTier === 'UNSTABLE').length;
    const marginalCount = criticalSegments.filter((item) => item.tel?.riskTier === 'MARGINAL').length;

    return {
      hasPossibility: criticalSegments.length > 0,
      criticalSegments,
      unstableCount,
      marginalCount,
    };
  }, [segmentsOnRoute, telemetries]);

  // THE DECISION GATE:
  // If ANY past landslide OR ANY active landslide possibility -> SHOW LANDSLIDE WARNINGS!
  // Otherwise -> SHOW RAINFALL AND THUNDER ONLY!
  const hasLandslideRiskOnRoute = pastLandslidesOnRoute.hasHistoricalSlides || activeLandslidePossibility.hasPossibility;

  const routeDecision = useMemo(() => {
    const now = Date.now();
    const routeRain = routeWeather?.rain1h ?? rain1h;
    const recentIncident = incidents.some((incident) => {
      if (incident.chainageKm < minKm || incident.chainageKm > maxKm || incident.validationType !== 'CONFIRMED_LANDSLIDE') return false;
      const ageDays = (now - new Date(incident.createdAt).getTime()) / 86400000;
      return ageDays < 548;
    });
    const severe = activeLandslidePossibility.unstableCount > 0 || recentIncident;
    const warning = !severe && (activeLandslidePossibility.marginalCount > 0 || routeRain >= 25 || (tomtomRoute?.trafficDelayMin || 0) >= 10);
    if (severe) return { label: 'AVOID ROUTE', tone: 'rose', detail: 'Recent landslide activity or unstable telemetry is present. Choose another route if available.' };
    if (warning) return { label: 'CAUTION', tone: 'amber', detail: 'Traffic, rainfall, or marginal slope conditions require slower travel and monitoring.' };
    return { label: 'SAFEST AVAILABLE ROUTE', tone: 'emerald', detail: 'No recent confirmed slide is detected on the selected corridor.' };
  }, [incidents, minKm, maxKm, activeLandslidePossibility, rain1h, routeWeather, tomtomRoute]);

  // Thunderstorm calculation based on live rain intensity
  const thunderLevel = useMemo(() => {
    if (rain1h >= 45) return { severity: 'SEVERE CLOUDBURST THUNDERSTORM', iconColor: 'text-amber-400', level: 'HIGH', lightningRate: 'Frequent Cloud-to-Ground Strikes', windSpeedKmH: '55-70 km/h' };
    if (rain1h >= 25) return { severity: 'ACTIVE MONSOON THUNDERSTORM', iconColor: 'text-amber-300', level: 'MODERATE', lightningRate: 'Intermittent Lightning Activity', windSpeedKmH: '35-50 km/h' };
    if (rain1h >= 10) return { severity: 'ISOLATED THUNDERSHOWERS', iconColor: 'text-cyan-300', level: 'LOW', lightningRate: 'Occasional Distant Rumbles', windSpeedKmH: '20-30 km/h' };
    return { severity: 'LIGHT MOUNTAIN DRIZZLE / NO THUNDER', iconColor: 'text-blue-300', level: 'MINIMAL', lightningRate: 'No Lightning Detected', windSpeedKmH: '10-15 km/h' };
  }, [rain1h]);

  const roadVisibilityMeters = useMemo(() => {
    if (rain1h >= 40) return 120; // very poor
    if (rain1h >= 20) return 350; // poor
    if (rain1h >= 10) return 800; // moderate
    return 2500; // good
  }, [rain1h]);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-5 space-y-4 text-slate-100">
      {/* 1. Header & Corridor Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 shadow-sm">
            <Navigation className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
              Route Safety & Journey Hazard Advisor
            </h2>
            <p className="text-xs text-slate-400">
              Input your origin & destination along the mountain highway corridor
            </p>
          </div>
        </div>

      </div>

      {/* 2. "From Where" and "To Where Go" Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Origin: "From Where" (Default is user location) */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>From Where (Starting Point):</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Km {fromKm.toFixed(1)}</span>
          </label>

          <div className="relative">
            <input
              value={fromSearch}
              onChange={(event) => {
                setFromSearch(event.target.value);
                searchPlaces(event.target.value, 'from');
              }}
              placeholder="Search starting location with OpenStreetMap"
              className="w-full mb-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <select
              value={fromKm}
              onChange={(e) => {
                const km = parseFloat(e.target.value);
                setFromKm(km);
                const wp = CORRIDOR_WAYPOINTS.find((w) => w.chainageKm === km);
                const name = wp ? wp.name : `Km ${km}`;
                setFromLocation(name);
                setSelectedCheckpointName(name);
                if (onFocusRouteBounds) {
                  onFocusRouteBounds(Math.min(km, toKm), Math.max(km, toKm));
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {!CORRIDOR_WAYPOINTS.some((wp) => Math.abs(wp.chainageKm - fromKm) < 0.05) && (
                <option value={fromKm}>
                  📍 {fromLocation} [Km {fromKm.toFixed(1)}]
                </option>
              )}
              {CORRIDOR_WAYPOINTS.map((wp) => (
                <option key={`from-${wp.chainageKm}`} value={wp.chainageKm}>
                  {wp.chainageKm === fromKm ? '📍 ' : ''}{wp.name} [Km {wp.chainageKm}]
                </option>
              ))}
            </select>
            {searchTarget === 'from' && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-[74px] z-30 max-h-44 overflow-y-auto rounded-xl bg-slate-900 border border-cyan-500/30 shadow-xl">
                {searchResults.slice(0, 5).map((result) => (
                  <button key={result.id} type="button" onClick={() => selectSearchPlace(result)} className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-cyan-950/70 border-b border-white/5">
                    <span className="block font-semibold">{result.poi?.name}</span>
                    <span className="block text-[10px] text-slate-400">{result.address?.freeformAddress}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Swap Button (Middle) */}
        <div className="md:col-span-2 flex items-center justify-center pt-2 md:pt-4">
          <button
            onClick={handleSwapRoute}
            className="p-2.5 rounded-full bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/50 text-slate-300 transition-colors cursor-pointer shadow-sm"
            title="Swap Origin & Destination (⇄)"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* Destination: "To Where Go" */}
        <div className="md:col-span-5 space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-rose-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>To Where Go (Destination):</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Km {toKm.toFixed(1)}</span>
          </label>

          <div className="relative">
            <input
              value={toSearch}
              onChange={(event) => {
                setToSearch(event.target.value);
                searchPlaces(event.target.value, 'to');
              }}
              placeholder="Search destination with OpenStreetMap"
              className="w-full mb-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <select
              value={toKm}
              onChange={(e) => {
                const km = parseFloat(e.target.value);
                setToKm(km);
                const wp = CORRIDOR_WAYPOINTS.find((w) => w.chainageKm === km);
                setToLocation(wp ? wp.name : `Km ${km}`);
                if (onFocusRouteBounds) {
                  onFocusRouteBounds(Math.min(fromKm, km), Math.max(fromKm, km));
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-slate-100 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {!CORRIDOR_WAYPOINTS.some((wp) => Math.abs(wp.chainageKm - toKm) < 0.05) && (
                <option value={toKm}>
                  📍 {toLocation} [Km {toKm.toFixed(1)}]
                </option>
              )}
              {CORRIDOR_WAYPOINTS.map((wp) => (
                <option key={`to-${wp.chainageKm}`} value={wp.chainageKm}>
                  {wp.chainageKm === toKm ? '📍 ' : ''}{wp.name} [Km {wp.chainageKm}] - Elev {wp.elevationM}m
                </option>
              ))}
            </select>
            {searchTarget === 'to' && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-[74px] z-30 max-h-44 overflow-y-auto rounded-xl bg-slate-900 border border-cyan-500/30 shadow-xl">
                {searchResults.slice(0, 5).map((result) => (
                  <button key={result.id} type="button" onClick={() => selectSearchPlace(result)} className="block w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-cyan-950/70 border-b border-white/5">
                    <span className="block font-semibold">{result.poi?.name}</span>
                    <span className="block text-[10px] text-slate-400">{result.address?.freeformAddress}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${routeDecision.tone === 'rose' ? 'bg-rose-950/60 border-rose-500/50' : routeDecision.tone === 'amber' ? 'bg-amber-950/50 border-amber-500/40' : 'bg-emerald-950/45 border-emerald-500/40'}`}>
        <div className="flex items-center gap-2 text-xs">
          {routeDecision.tone === 'rose' ? <ShieldAlert className="w-5 h-5 text-rose-400" /> : routeDecision.tone === 'amber' ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          <div>
            <strong className={routeDecision.tone === 'rose' ? 'text-rose-300' : routeDecision.tone === 'amber' ? 'text-amber-300' : 'text-emerald-300'}>{routeDecision.label}</strong>
            <p className="text-[11px] text-slate-300">{routeDecision.detail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-300">
          <span className="flex items-center gap-1" title={routeWeather?.provider || 'Dashboard weather telemetry'}><CloudRain className="w-3.5 h-3.5 text-blue-400" />{(routeWeather?.rain1h ?? rain1h).toFixed(1)} mm/h</span>
          <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5 text-amber-400" />{tomtomRoute ? `+${tomtomRoute.trafficDelayMin}m traffic` : 'Traffic pending'}</span>
        </div>
      </div>

      {/* Quick Select Destination Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1 border-t border-slate-800/60 text-slate-400">
        <span className="text-[11px] text-slate-400 shrink-0 font-medium">Quick Routes:</span>
        <button
          onClick={() => {
            setFromKm(0.0);
            setFromLocation('Rishikesh (Triveni Ghat / Bypass)');
            setToKm(215.0);
            setToLocation('Badrinath Dham (Final Terminus)');
          }}
          className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] shrink-0 transition-colors cursor-pointer border border-slate-700"
        >
          Entire Highway (Rishikesh &rarr; Badrinath)
        </button>
        <button
          onClick={() => {
            setFromKm(79.0);
            setFromLocation('Maletha Terraces (Srinagar Valley)');
            setToKm(88.0);
            setToLocation('Srinagar Town Central');
          }}
          className="px-2.5 py-1 rounded-full bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 text-[11px] shrink-0 transition-colors cursor-pointer border border-emerald-500/30"
          title="Safe valley stretch with no landslides (Demonstrates 'Rainfall and Thunder Only' mode)"
        >
          🌱 Srinagar Valley (Zero Landslides • Rain & Thunder Only)
        </button>
        <button
          onClick={() => {
            setFromKm(88.0);
            setFromLocation('Srinagar Town Central');
            setToKm(124.25);
            setToLocation('Rudraprayag (Mandakini Sangam)');
          }}
          className="px-2.5 py-1 rounded-full bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-[11px] shrink-0 transition-colors cursor-pointer border border-rose-500/30"
        >
          🚨 Sirobagarh Choke Point (Srinagar &rarr; Rudraprayag)
        </button>
        <button
          onClick={() => {
            setFromKm(124.25);
            setFromLocation('Rudraprayag (Mandakini Sangam)');
            setToKm(188.0);
            setToLocation('Joshimath High Mountain Hub');
          }}
          className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] shrink-0 transition-colors cursor-pointer border border-slate-700"
        >
          🏔️ Rudraprayag &rarr; Joshimath
        </button>
      </div>

      {/* Journey Stats Bar with TomTom Routing Integration */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-sans">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>Highway Corridor:</span>
            <strong className="text-white font-mono">
              {tomtomRoute ? `${tomtomRoute.distanceKm} km (TomTom)` : `${distanceKm} km`}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Drive Time:</span>
            <strong className="text-white font-mono">
              {tomtomRoute 
                ? `${Math.floor(tomtomRoute.travelTimeMin / 60)}h ${tomtomRoute.travelTimeMin % 60}m`
                : `~${estimatedDriveTimeHours} hours`}
            </strong>
          </div>

          {tomtomRoute && (
            <div className="flex items-center gap-1.5 text-slate-300">
              <Car className="w-4 h-4 text-emerald-400" />
              <span>TomTom Live Traffic:</span>
              <strong className={tomtomRoute.trafficDelayMin > 5 ? 'text-amber-400 font-mono' : 'text-emerald-400 font-mono'}>
                {tomtomRoute.trafficDelayMin > 0 ? `+${tomtomRoute.trafficDelayMin} min delay` : 'Clear Flow (0m delay)'}
              </strong>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-300">
            <Mountain className="w-4 h-4 text-purple-400" />
            <span>Monitored Road Sections:</span>
            <strong className="text-cyan-300 font-mono">{segmentsOnRoute.length} sections</strong>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
            {isLoadingTomtomRoute ? 'Routing via TomTom...' : 'TomTom Live Verified'}
          </span>

          {onFocusRouteBounds && (
            <button
              onClick={() => onFocusRouteBounds(minKm, maxKm)}
              className="px-2.5 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Highlight Route on Map</span>
            </button>
          )}
        </div>
      </div>


      {/* ========================================================================= */}
      {/* 3. CONDITIONAL SAFETY EVALUATION (USER SPECIFICATION)                      */}
      {/* IF THERE IS ANY LANDSLIDE IN PAST OR POSSIBILITY -> SHOW LANDSLIDE WARNING*/}
      {/* OTHERWISE -> SHOW RAINFALL AND THUNDER ONLY                                */}
      {/* ========================================================================= */}

      {hasLandslideRiskOnRoute ? (
        /* CASE 1: LANDSLIDE IN PAST OR POSSIBILITY OF LANDSLIDE DETECTED */
        <div className="space-y-4 pt-1">
          {/* Main Warning Banner */}
          <div 
            id="route-safety-information-banner"
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/70 border-2 border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.25)] space-y-3 transition-all duration-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500 text-rose-400 shrink-0">
                  <ShieldAlert className="w-6 h-6 animate-pulse text-rose-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold text-rose-300 tracking-wide uppercase">
                      🚨 Landslide & Rockfall Threat on Selected Route
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold font-mono border border-rose-500/30">
                      WARNING ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-0.5">
                    {activeLandslidePossibility.unstableCount > 0 
                      ? `${activeLandslidePossibility.unstableCount} road stretch${activeLandslidePossibility.unstableCount > 1 ? 'es are' : ' is'} at IMMINENT COLLAPSE RISK under current rainfall.` 
                      : 'Historical landslide slide-prone sector detected with active rainfall saturation.'}
                  </p>
                </div>
              </div>

              {/* Right Side: Past Slide Badge + "More" / "Less" Toggle Button */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <div className="p-2 px-3 rounded-xl bg-slate-950/80 border border-rose-500/30 text-right shrink-0">
                  <div className="text-[10px] text-slate-400 uppercase">Historical Record</div>
                  <div className="text-xs sm:text-sm font-bold text-rose-400">
                    {pastLandslidesOnRoute.totalCount} Past Landslides
                  </div>
                </div>

                <button
                  id="route-info-toggle-more-btn"
                  type="button"
                  onClick={() => setIsHazardInfoExpanded(!isHazardInfoExpanded)}
                  aria-expanded={isHazardInfoExpanded}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500/50 hover:border-rose-400 text-rose-200 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                  title={isHazardInfoExpanded ? "Minimise safety information" : "Show more safety information"}
                >
                  <span>{isHazardInfoExpanded ? 'Less' : 'More'}</span>
                  {isHazardInfoExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-rose-300" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-rose-300" />
                  )}
                </button>
              </div>
            </div>

            {/* Minimized Teaser Banner */}
            {!isHazardInfoExpanded && (
              <div className="flex items-center justify-between pt-1.5 border-t border-rose-500/20 text-[11px] text-rose-200/90">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Information minimised: Driver safety directives, {segmentsOnRoute.length} sector risks & weather telemetry are hidden.</span>
                </div>
                <button
                  id="route-info-show-more-text-btn"
                  type="button"
                  onClick={() => setIsHazardInfoExpanded(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline cursor-pointer shrink-0 ml-2"
                >
                  Click "More" to expand &rarr;
                </button>
              </div>
            )}

            {/* Expanded Detailed Information */}
            {isHazardInfoExpanded && (
              <div className="space-y-3 pt-2 border-t border-rose-500/30 animate-in fade-in duration-150">
                {/* Travel Directives */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30 text-xs text-slate-200 space-y-1.5">
                  <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Travel Advisory for Drivers on this Stretch:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] sm:text-xs">
                    <li>
                      <strong>Do not travel through high-risk passes during peak rain:</strong> Heavy moisture has reduced soil grip; rockfall can trigger without warning.
                    </li>
                    <li>
                      <strong>Designated safe waiting zones:</strong> If trapped or waiting out rain, halt at {minKm < 70 ? 'Byasi or Devprayag town' : 'Srinagar or Rudraprayag safe parking complexes'}.
                    </li>
                    <li>
                      Check with Border Roads Organisation (BRO) and Uttarakhand Police Control Room (Dial 112 / 1070) before passing Km {minKm} to Km {maxKm}.
                    </li>
                  </ul>
                </div>

                {/* List of Affected Hotspots on This Route */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Vulnerable Highway Stretches on Your Route:</span>
                    <span className="text-[11px] text-slate-400">Click section for detailed physics</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {segmentsOnRoute.map((seg) => {
                      const tel = telemetries.get(seg.id);
                      const isCritical = tel?.riskTier === 'UNSTABLE';
                      const isMarginal = tel?.riskTier === 'MARGINAL';
                      const recentIncident = incidents.some((incident) => {
                        const ageDays = (Date.now() - new Date(incident.createdAt).getTime()) / 86400000;
                        return incident.validationType === 'CONFIRMED_LANDSLIDE' && ageDays < 548 && Math.abs(incident.chainageKm - seg.chainageKm) <= 3;
                      });
                      const oldIncident = !recentIncident && (seg.historicalSlideCount || 0) > 0;

                      return (
                        <div
                          key={seg.id}
                          onClick={() => onSelectSegment(seg.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isCritical || recentIncident
                              ? 'bg-rose-950/60 border-rose-500/60 hover:border-rose-400 shadow-sm'
                              : isMarginal || oldIncident
                              ? 'bg-amber-950/50 border-amber-500/50 hover:border-amber-400'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-100">{seg.name}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  isCritical || recentIncident
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                    : isMarginal || oldIncident
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {isCritical || recentIncident ? '🚨 AVOID' : isMarginal || oldIncident ? '⚠️ YELLOW WARNING' : 'STABLE'}
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px] text-slate-300 border-t border-slate-800/80 pt-1.5">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Chainage:</span>
                              <strong>Km {seg.chainageKm}</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Past Slides:</span>
                              <strong className="text-rose-400">{seg.historicalSlideCount} slides</strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Slope Angle:</span>
                              <strong>{seg.slopeBeta}° cliff</strong>
                            </div>
                          </div>

                          <div className="mt-1.5 text-[11px] text-slate-400 flex items-center justify-between">
                            <span>Ground Water: <b className="text-cyan-300">{tel ? `${tel.waterTableHeightM.toFixed(1)}m waterlogged` : '--'}</b></span>
                            <span className="text-cyan-400 hover:underline">Inspect &rarr;</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Accompanying Weather & Thunder for this Hazardous Route */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-blue-400" />
                    <span>Corridor Weather: <strong>{rain1h.toFixed(1)} mm/hr Rainfall</strong> (24h Total: {rain24h.toFixed(1)} mm)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${thunderLevel.iconColor}`} />
                    <span>Thunderstorm Status: <strong className={thunderLevel.iconColor}>{thunderLevel.severity}</strong></span>
                  </div>
                </div>

                {/* Bottom Collapse Button */}
                <div className="flex justify-end pt-1">
                  <button
                    id="route-info-toggle-less-bottom-btn"
                    type="button"
                    onClick={() => setIsHazardInfoExpanded(false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Less</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* CASE 2: NO LANDSLIDE IN PAST AND NO POSSIBILITY OF LANDSLIDE */
        /* AS REQUESTED: "other wise show rain fall and thunder only"   */
        <div className="space-y-4 pt-1">
          {/* Calm & Reassuring Safety Stamp */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs sm:text-sm font-bold text-emerald-300">
                  Zero Landslide Risk on Selected Route (No Past Slide History & Slopes Geotechnically Stable)
                </span>
                <p className="text-[11px] text-slate-300">
                  The highway foundation on this stretch consists of solid bedded strata with zero collapse history.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 shrink-0">
              LANDSLIDE FREE
            </span>
          </div>

          {/* DEDICATED "RAINFALL AND THUNDER ONLY" HERO INTERFACE */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950/40 border border-blue-500/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-950 border border-blue-500/50 text-blue-400 shadow-md">
                  <CloudRain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    Live Rainfall & Thunderstorm Travel Conditions
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
                      WEATHER RADAR
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Route weather advisory from {fromLocation.split('(')[0]} to {toLocation.split('(')[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                  Corridor Elevation: <strong>{minKm < 50 ? '360m – 800m' : '800m – 1,890m'} MSL</strong>
                </span>
              </div>
            </div>

            {/* Main Weather Metrics Grid (Rainfall & Thunder Only) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Rainfall Intensity */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-xs flex items-center">
                  <span className="flex items-center gap-1 text-blue-400 font-semibold">
                    <CloudRain className="w-4 h-4" /> Rainfall Rate
                  </span>
                </div>
                <div className="text-2xl font-bold text-cyan-300">
                  {rain1h.toFixed(1)} <span className="text-xs font-normal text-slate-400">mm/hr</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {rain1h > 30 ? 'Heavy Continuous Downpour' : rain1h > 15 ? 'Moderate Mountain Rain' : 'Light Showers'}
                </div>
              </div>

              {/* 2. Thunderstorm & Lightning */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-xs flex items-center">
                  <span className={`flex items-center gap-1 font-semibold ${thunderLevel.iconColor}`}>
                    <Zap className="w-4 h-4" /> Thunder & Lightning
                  </span>
                </div>
                <div className={`text-sm sm:text-base font-bold ${thunderLevel.iconColor}`}>
                  {thunderLevel.severity}
                </div>
                <div className="text-[11px] text-slate-400">
                  {thunderLevel.lightningRate}
                </div>
              </div>

              {/* 3. 24h Antecedent Accumulation */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-xs flex items-center">
                  <span className="flex items-center gap-1 text-indigo-400 font-semibold">
                    <Waves className="w-4 h-4" /> 24h Rain Total
                  </span>
                </div>
                <div className="text-2xl font-bold text-indigo-300">
                  {rain24h.toFixed(1)} <span className="text-xs font-normal text-slate-400">mm</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Mountain catchment saturation: {rain24h > 100 ? 'High' : 'Normal'}
                </div>
              </div>

              {/* 4. Road Visibility & Surface Grip */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-slate-400 text-xs flex items-center">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Eye className="w-4 h-4" /> Road Visibility
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  ~{roadVisibilityMeters} <span className="text-xs font-normal text-slate-400">meters</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {roadVisibilityMeters < 300 ? 'Dense mist: Low beams required' : 'Clear highway sightlines'}
                </div>
              </div>
            </div>

            {/* Rain & Thunder Driving Safety Tips */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-cyan-300 flex items-center gap-2">
                <Car className="w-4 h-4 text-cyan-400" />
                <span>Mountain Driving Weather Guidelines for this Journey:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span><strong>Wet Asphalt Traction:</strong> Stopping distance increases by 45%. Maintain 4-second following distance.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span><strong>Thunder & Lightning:</strong> If severe lightning strikes occur, stay inside vehicle (acts as a safe Faraday cage).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-400 font-bold">•</span>
                  <span><strong>Hydroplaning Caution:</strong> Watch for pooled surface water along river curves and bridge abutments.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">•</span>
                  <span><strong>Wind Gusts:</strong> Mountain winds estimated at {thunderLevel.windSpeedKmH}. Hold steering wheel firmly.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Interactive GPS & Highway Location Picker Modal */}
      {isGpsModalOpen && (
        <div 
          id="gps-location-modal"
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsGpsModalOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
                  <LocateFixed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Mountain Highway Location & GPS Manager
                  </h3>
                  <p className="text-xs text-slate-400">
                    Set your "From Where" origin via device GPS, live simulation, or corridor checkpoints
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGpsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Location Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* GPS Telemetry & Scan Section */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${isLocatingUser ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                    <span className="text-xs font-semibold text-slate-200">
                      {isLocatingUser ? 'Querying GPS Hardware...' : 'Device GPS Status'}
                    </span>
                    {detectedCoords && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                        {detectedCoords.lat.toFixed(4)}°N, {detectedCoords.lng.toFixed(4)}°E
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUseCurrentGPS}
                      disabled={isLocatingUser}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${isLocatingUser ? 'animate-spin' : ''}`} />
                      <span>{isLocatingUser ? 'Locating...' : 'Re-scan Device GPS'}</span>
                    </button>

                    <button
                      onClick={handleSimulateMovingGps}
                      className="px-3 py-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Simulate a vehicle driving on NH-58"
                    >
                      <Car className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Simulate Vehicle Drive</span>
                    </button>
                  </div>
                </div>

                {gpsStatus && (
                  <p className="text-xs text-cyan-300/90 bg-cyan-950/40 px-3 py-1.5 rounded-lg border border-cyan-500/20">
                    {gpsStatus}
                  </p>
                )}
              </div>

              {/* Highway Corridor Checkpoints List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Or Select Starting Point (From Where) along NH-58:</span>
                  </span>
                  <span className="text-slate-400 text-[11px]">1-Click Set Origin</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {CORRIDOR_WAYPOINTS.map((wp) => {
                    const isSelected = Math.abs(wp.chainageKm - fromKm) < 0.1;
                    return (
                      <button
                        key={`modal-wp-${wp.chainageKm}`}
                        onClick={() => handleSelectCheckpoint(wp)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-sm ring-1 ring-cyan-500/50'
                            : 'bg-slate-950/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-medium text-xs truncate">
                            <span className="truncate">{wp.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-mono">
                            <span>Km {wp.chainageKm.toFixed(1)}</span>
                            <span>•</span>
                            <span>Elev {wp.elevationM}m</span>
                            {wp.hasHistoricalSlides && (
                              <span className="text-amber-400 font-sans font-semibold">• Slide Prone</span>
                            )}
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="p-1 rounded-full bg-cyan-500 text-slate-950">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            Pick
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
              <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Selected Origin: <strong className="text-white">Km {fromKm.toFixed(1)} ({fromLocation.split(' ')[0]})</strong></span>
              </div>
              <button
                onClick={() => setIsGpsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                Done & View Safety Route
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
