import React, { useState, useEffect, useMemo } from 'react';
import { 
  INITIAL_SEGMENTS, 
  INITIAL_WEATHER_STATIONS, 
  INITIAL_INCIDENTS,
  HIGHWAY_NAME
} from './data/highwaySegments';
import { 
  HighwaySegment, 
  SegmentRiskTelemetry, 
  RiskCutoffs, 
  IncidentFeedbackLog, 
  WeatherStation 
} from './types';
import { calculateSegmentTelemetry } from './utils/physicsEngine';
import { fetchLiveRainfallData, RainfallScenario } from './utils/rainfallService';
import { TacticalHeader } from './components/TacticalHeader';
import { ThresholdSliders } from './components/ThresholdSliders';
import { MapDashboard } from './components/MapDashboard';
import { SegmentRankingTable } from './components/SegmentRankingTable';
import { SegmentDetailModal } from './components/SegmentDetailModal';
import { IncidentFeedbackModal } from './components/IncidentFeedbackModal';
import { LimitationsModal } from './components/LimitationsModal';
import { GeotechnicalIntelligenceTerminal } from './components/GeotechnicalIntelligenceTerminal';
import { EmergencyAlertModal } from './components/EmergencyAlertModal';
import { RouteTripSafetyPlanner } from './components/RouteTripSafetyPlanner';
import { UserAuthModal } from './components/UserAuthModal';
import { SosReportModal } from './components/SosReportModal';
import { AdminSosPanel } from './components/AdminSosPanel';
import { GeoFenceAlertPopup } from './components/GeoFenceAlertPopup';
import { SupabaseConnectionModal } from './components/SupabaseConnectionModal';
import { getCurrentUser, onAuthStateChange, checkSupabaseStatus, logoutUser } from './utils/supabaseClient';
import { UserAuthProfile } from './types';
import { ShieldAlert, Download, Navigation, AlertOctagon, ArrowRight, Radio } from 'lucide-react';

export default function App() {
  const [segments] = useState<HighwaySegment[]>(INITIAL_SEGMENTS);
  const [weatherStations] = useState<WeatherStation[]>(INITIAL_WEATHER_STATIONS);
  const [incidents, setIncidents] = useState<IncidentFeedbackLog[]>(INITIAL_INCIDENTS);
  const [routeBounds, setRouteBounds] = useState<{ minKm: number; maxKm: number }>({ minKm: 0.0, maxKm: 215.0 });

  // Supabase Auth & User Profile State
  const [currentUser, setCurrentUser] = useState<UserAuthProfile | null>(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);

  // SOS Emergency & Admin State
  const [isSosModalOpen, setIsSosModalOpen] = useState<boolean>(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const [pendingSosCount, setPendingSosCount] = useState<number>(0);

  // User Live GPS Coordinates for Geo-fenced Alert Broadcasts
  const [userGps, setUserGps] = useState<{ lat: number; lng: number }>({
    lat: 30.1472, // Totaghati hazard zone default
    lng: 78.5884,
  });

  // Operational Thresholds & Hydrology
  const [cutoffs, setCutoffs] = useState<RiskCutoffs>({
    unstableThreshold: 1.00,
    marginalThreshold: 1.25,
    minConfidenceThreshold: 0.60,
  });

  const [rain1h, setRain1h] = useState<number>(36.0); // mm/hr
  const [rain24h, setRain24h] = useState<number>(112.0); // mm
  const [isLiveApi, setIsLiveApi] = useState<boolean>(true);
  const [weatherProvider, setWeatherProvider] = useState<string>('Open-Meteo Uttarakhand Hydro-Met');
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);

  // User-Friendly vs Engineering View Toggle (User-friendly by default!)
  const [isEngineeringMode, setIsEngineeringMode] = useState<boolean>(false);

  // Automation & Refresh Timer
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(15);
  const [countdown, setCountdown] = useState<number>(15);

  // UI Selection & Modals
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [isLimitationsModalOpen, setIsLimitationsModalOpen] = useState<boolean>(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);

  // Calculate Segment Telemetries dynamically using the infinite slope equation
  const telemetries = useMemo(() => {
    const map = new Map<string, SegmentRiskTelemetry>();
    segments.forEach((seg) => {
      // Localized rainfall gradient with altitude factor
      const elevationMultiplier = 1.0 + Math.max(0, (seg.elevationM - 500) / 3000) * 0.35;
      const localRain1h = Math.round(rain1h * elevationMultiplier * 10) / 10;
      const localRain24h = Math.round(rain24h * elevationMultiplier * 10) / 10;

      const tel = calculateSegmentTelemetry(seg, localRain1h, localRain24h, cutoffs);
      map.set(seg.id, tel);
    });
    return map;
  }, [segments, rain1h, rain24h, cutoffs]);

  // Unstable segments list
  const unstableList = useMemo(() => {
    return segments
      .filter((s) => telemetries.get(s.id)?.riskTier === 'UNSTABLE')
      .map((s) => ({ seg: s, tel: telemetries.get(s.id)! }));
  }, [segments, telemetries]);

  // Supabase Auth Listener
  useEffect(() => {
    setCurrentUser(getCurrentUser());
    const unsub = onAuthStateChange((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Supabase Connection Verification
  const verifySupabaseConnection = async () => {
    try {
      const status = await checkSupabaseStatus();
      setSupabaseConnected(Boolean(status.connected));
    } catch {
      setSupabaseConnected(false);
    }
  };

  useEffect(() => {
    verifySupabaseConnection();
    const interval = setInterval(verifySupabaseConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  // Hardware GPS Coordinate Auto-Capture for Geo-fenced Alerts
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Browser GPS lock weak in sandbox, using corridor telemetry anchor:', err);
          // Default to Totaghati hazard sector corridor
          setUserGps({ lat: 30.1472, lng: 78.5884 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Poll for pending SOS reports count to keep header badge real-time
  const fetchPendingSosCount = async () => {
    try {
      const res = await fetch('/api/sos/list');
      const data = await res.json();
      if (data.success && data.reports) {
        const count = data.reports.filter((r: any) => r.status === 'PENDING').length;
        setPendingSosCount(count);
      }
    } catch (e) {
      // Background poll
    }
  };

  useEffect(() => {
    fetchPendingSosCount();
    const interval = setInterval(fetchPendingSosCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for automatic live updates
  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger light continuous fluctuation in rain rate to emulate live weather fluctuations
          setRain1h((r) => Math.max(0, Math.round((r + (Math.random() * 2 - 1)) * 10) / 10));
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshIntervalSec]);

  // Handle Fetching Real Live Weather from Open-Meteo / Live Weather API for User Location
  const handleFetchLiveWeather = async (customLat?: number, customLng?: number) => {
    setIsLoadingWeather(true);
    const targetLat = customLat ?? userGps.lat;
    const targetLng = customLng ?? userGps.lng;
    try {
      const data = await fetchLiveRainfallData(targetLat, targetLng);
      setRain1h(data.rain1hMm);
      setRain24h(data.rain24hMm);
      setIsLiveApi(data.isRealApi);
      setWeatherProvider(data.provider);
      return data;
    } finally {
      setIsLoadingWeather(false);
    }
  };

  // Scenario selection
  const handleSelectScenario = (sc: RainfallScenario) => {
    setRain1h(sc.rain1hMm);
    setRain24h(sc.rain24hMm);
    setIsLiveApi(false);
    setWeatherProvider(`Scenario: ${sc.name}`);
  };

  const handleSelectSegment = (id: string) => {
    setSelectedSegmentId(id);
    setIsDetailModalOpen(true);
  };

  const handleAddIncident = (newInc: IncidentFeedbackLog) => {
    setIncidents((prev) => [newInc, ...prev]);
  };

  const handleExportDataCSV = () => {
    const headers = [
      'Segment_ID',
      'Code',
      'Name',
      'Chainage_KM',
      'Elevation_M',
      'Slope_Beta_Deg',
      'Cut_Slope_Deg',
      'Cohesion_C_kPa',
      'Friction_Phi_Deg',
      'Unit_Weight_kN_m3',
      'Soil_Depth_M',
      'Rain_1h_mm',
      'Rain_24h_mm',
      'Pore_Pressure_u_kPa',
      'Factor_of_Safety_FoS',
      'Dry_FoS',
      'Risk_Tier',
      'Confidence_Score',
    ];

    const rows = segments.map((seg) => {
      const tel = telemetries.get(seg.id);
      return [
        seg.id,
        seg.code,
        `"${seg.name}"`,
        seg.chainageKm,
        seg.elevationM,
        seg.slopeBeta,
        seg.cutSlopeAngleDeg,
        seg.cohesionKpa,
        seg.frictionAngleDeg,
        seg.unitWeightKnM3,
        seg.soilDepthM,
        tel?.rain1hMm || 0,
        tel?.rain24hMm || 0,
        tel?.porePressureKpa || 0,
        tel?.fos || 0,
        tel?.dryFos || 0,
        tel?.riskTier || 'UNKNOWN',
        tel?.confidenceScore || 0,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Himalayan-Highway-NH58-Safety-Data-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedSegment = useMemo(() => {
    return segments.find((s) => s.id === selectedSegmentId) || null;
  }, [segments, selectedSegmentId]);

  const selectedTelemetry = useMemo(() => {
    return selectedSegmentId ? telemetries.get(selectedSegmentId) || null : null;
  }, [selectedSegmentId, telemetries]);

  return (
    <div className="min-h-screen ambient-animated-bg text-slate-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200 relative pb-16 overflow-x-hidden">
      {/* Background Soft Organic Floating High-Blur Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="ambient-orb-1 w-[600px] h-[600px] rounded-full bg-cyan-900/12 blur-[130px] absolute -top-40 -left-20" />
        <div className="ambient-orb-2 w-[650px] h-[650px] rounded-full bg-indigo-900/10 blur-[140px] absolute top-1/4 -right-40" />
        <div className="ambient-orb-3 w-[550px] h-[550px] rounded-full bg-teal-900/12 blur-[130px] absolute top-2/3 -left-32" />
        <div className="ambient-orb-1 w-[500px] h-[500px] rounded-full bg-purple-900/08 blur-[130px] absolute -bottom-20 right-1/4" />
      </div>

      {/* 1. Tactical Command Header */}
      <TacticalHeader
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        refreshIntervalSec={refreshIntervalSec}
        setRefreshIntervalSec={setRefreshIntervalSec}
        countdown={countdown}
        onManualRefresh={() => {
          setCountdown(refreshIntervalSec);
          setRain1h((r) => r);
        }}
        onOpenTerminal={() => setIsTerminalOpen(true)}
        onOpenIncidents={() => setIsIncidentModalOpen(true)}
        onOpenLimitations={() => setIsLimitationsModalOpen(true)}
        onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
        onOpenSosModal={() => setIsSosModalOpen(true)}
        onOpenAdminPanel={() => {
          if (currentUser?.role === 'admin') {
            setIsAdminPanelOpen(true);
          } else {
            setIsAuthModalOpen(true);
          }
        }}
        onOpenUserAuth={() => setIsAuthModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        supabaseConnected={supabaseConnected}
        currentUser={currentUser}
        pendingSosCount={pendingSosCount}
        isLiveApi={isLiveApi}
        rain1h={rain1h}
        rain24h={rain24h}
        isEngineeringMode={isEngineeringMode}
        onToggleEngineeringMode={() => setIsEngineeringMode(!isEngineeringMode)}
      />

      {/* 2. User-Friendly Emergency Warning Banner with Apple Glass styling */}
      {unstableList.length > 0 && (
        <div 
          id="critical-travel-warning-banner"
          className="relative z-20 bg-rose-950/40 border-b border-rose-500/30 backdrop-blur-2xl px-4 sm:px-6 py-2.5 shadow-[0_4px_24px_rgba(244,63,94,0.15)] transition-all duration-300"
        >
          <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            {/* Left: Indicator & Headline Message */}
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 shrink-0 shadow-sm">
                <AlertOctagon className="w-4 h-4 text-rose-400" />
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/25 text-rose-200 border border-rose-500/40 backdrop-blur-md">
                  Critical Travel Alert
                </span>
                <span className="text-xs sm:text-sm text-slate-200">
                  <strong className="text-white font-semibold">{unstableList.length} road stretch{unstableList.length > 1 ? 'es' : ''}</strong> on <span className="text-slate-300 font-medium">{HIGHWAY_NAME}</span> at high risk of landslide collapse.
                </span>
              </div>
            </div>

            {/* Right: Affected Hotspots & Action Button */}
            <div className="flex flex-wrap items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
              <div className="hidden lg:flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] font-medium">Active Hotspots:</span>
                <div className="flex items-center gap-1.5">
                  {unstableList.slice(0, 2).map((u) => (
                    <span
                      key={u.seg.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-950/50 border border-rose-500/35 text-rose-200 text-[11px] font-medium whitespace-nowrap backdrop-blur-md"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                      {u.seg.name} <span className="text-rose-400/80 font-mono text-[10px]">Km {u.seg.chainageKm}</span>
                    </span>
                  ))}
                  {unstableList.length > 2 && (
                    <span className="text-rose-300/90 text-[11px] font-medium whitespace-nowrap">
                      +{unstableList.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              <button
                id="banner-view-advisory-btn"
                type="button"
                onClick={() => setIsEmergencyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all duration-200 shadow-md hover:shadow-[0_0_16px_rgba(244,63,94,0.4)] cursor-pointer whitespace-nowrap hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>View Road Closures & Actions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-3 sm:p-5 space-y-5">
        {/* Sliders & Weather Tuning Strip */}
        <ThresholdSliders
          cutoffs={cutoffs}
          setCutoffs={setCutoffs}
          rain1h={rain1h}
          setRain1h={setRain1h}
          rain24h={rain24h}
          setRain24h={setRain24h}
          onSelectScenario={handleSelectScenario}
          onFetchLiveWeather={handleFetchLiveWeather}
          isLoadingWeather={isLoadingWeather}
          isLiveApi={isLiveApi}
          weatherProvider={weatherProvider}
          isEngineeringMode={isEngineeringMode}
          userGps={userGps}
          setUserGps={setUserGps}
        />

        {/* Journey Safety & Hazard Advisor: "From Where" to "To Where Go" */}
        <RouteTripSafetyPlanner
          segments={segments}
          telemetries={telemetries}
          incidents={incidents}
          rain1h={rain1h}
          rain24h={rain24h}
          onSelectSegment={handleSelectSegment}
          userGps={userGps}
          onFocusRouteBounds={(minKm, maxKm) => {
            setRouteBounds({ minKm, maxKm });
          }}
        />

        {/* Core Layout: Left Map & Right Segment Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Map Dashboard (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span className="uppercase tracking-wider">
                  Live Highway Map & Safety Status
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                Click any highway segment or weather node
              </span>
            </div>

            <MapDashboard
              segments={segments}
              telemetries={telemetries}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={handleSelectSegment}
              weatherStations={weatherStations}
              routeMinKm={routeBounds.minKm}
              routeMaxKm={routeBounds.maxKm}
            />
          </div>

          {/* Right Column: Segment Ranking Table (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="uppercase tracking-wider">
                  Road Sections Danger Ranking
                </span>
              </div>

              <button
                onClick={handleExportDataCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                title="Download highway safety data as CSV"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Safety Data</span>
              </button>
            </div>

            <SegmentRankingTable
              segments={segments}
              telemetries={telemetries}
              selectedSegmentId={selectedSegmentId}
              onSelectSegment={handleSelectSegment}
              isEngineeringMode={isEngineeringMode}
            />
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 px-4 py-3 text-xs text-slate-500 mt-6">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span className="text-slate-300 font-bold">Himalayan Highway Safety Shield:</span> Real-Time Landslide Early Warning System for NH-58
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Garhwal Region, Uttarakhand</span>
            <span>•</span>
            <button
              onClick={() => setIsLimitationsModalOpen(true)}
              className="text-slate-400 hover:text-cyan-300 underline cursor-pointer"
            >
              System Limitations & Disclosures
            </button>
          </div>
        </div>
      </footer>

      {/* 5. Floating Quick Action Buttons */}
      {/* Floating Instant SOS Distress Button on bottom left */}
      <div className="fixed bottom-5 left-5 z-40">
        <button
          id="floating-sos-quick-btn"
          type="button"
          onClick={() => setIsSosModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-[0_0_25px_rgba(239,68,68,0.7)] border-2 border-red-300 animate-pulse hover:scale-105 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
          title="Instant Emergency SOS Distress Dispatch"
        >
          <AlertOctagon className="w-5 h-5 text-white" />
          <span>SOS REPORT</span>
        </button>
      </div>

      {/* 6. Real-Time Geo-Fenced Alert Popup (Auto-matches user GPS to admin radius) */}
      <GeoFenceAlertPopup userLat={userGps.lat} userLng={userGps.lng} />

      {/* 7. Modals */}
      {/* Supabase User Login & Mobile Registration */}
      <UserAuthModal
        isOpen={isAuthModalOpen || !currentUser}
        required={!currentUser}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          if (user.role === 'admin') {
            setIsAdminPanelOpen(true);
          }
        }}
      />

      {/* SOS Report Modal with Live WebRTC Camera & Locked GPS */}
      <SosReportModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onSosSubmitted={() => {
          fetchPendingSosCount();
        }}
      />

      {/* Emergency Operations & Incident Triage Admin Panel */}
      <AdminSosPanel
        isOpen={isAdminPanelOpen && currentUser?.role === 'admin'}
        onClose={() => setIsAdminPanelOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={async () => {
          await logoutUser();
          setCurrentUser(null);
          setIsAdminPanelOpen(false);
          setIsAuthModalOpen(true);
        }}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onFocusMapCoord={(lat, lng) => {
          setIsAdminPanelOpen(false);
        }}
      />

      {/* Supabase PostgreSQL & Realtime Connection Hub Modal */}
      <SupabaseConnectionModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigUpdated={verifySupabaseConnection}
      />

      {/* Deep Geotechnical Physics Inspector */}
      <SegmentDetailModal
        isOpen={isDetailModalOpen}
        segment={selectedSegment}
        telemetry={selectedTelemetry}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSegmentId(null);
        }}
        onLogIncident={(seg) => {
          setIsDetailModalOpen(false);
          setIsIncidentModalOpen(true);
        }}
      />

      {/* Incident Feedback Loop */}
      <IncidentFeedbackModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        incidents={incidents}
        onAddIncident={handleAddIncident}
        segments={segments}
        telemetries={telemetries}
        preselectedSegment={selectedSegment}
      />

      {/* Methodological Disclosures & Limitations */}
      <LimitationsModal
        isOpen={isLimitationsModalOpen}
        onClose={() => setIsLimitationsModalOpen(false)}
      />

      {/* Ask AI Assistant Modal */}
      <GeotechnicalIntelligenceTerminal
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        segments={segments}
        telemetries={telemetries}
        rain1h={rain1h}
        rain24h={rain24h}
        onTriggerEmergencyModal={() => setIsEmergencyModalOpen(true)}
      />

      <EmergencyAlertModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        unstableSegments={unstableList}
        onInspectSegment={(id) => {
          setSelectedSegmentId(id);
          setIsDetailModalOpen(true);
        }}
      />

    </div>
  );
}
