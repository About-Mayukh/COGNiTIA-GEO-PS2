import React, { useState, useEffect } from 'react';
import { SosReport, EmergencyBroadcast, UserAuthProfile } from '../types';
import { 
  X, 
  ShieldAlert, 
  Radio, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Send, 
  Bell, 
  RefreshCw, 
  Camera, 
  Trash2, 
  Volume2, 
  VolumeX, 
  LogOut,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Filter,
  Database
} from 'lucide-react';
import { checkSupabaseStatus, subscribeToRealtimeSos } from '../utils/supabaseClient';

interface AdminSosPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAuthProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onFocusMapCoord?: (lat: number, lng: number) => void;
  onOpenSupabaseModal?: () => void;
}

export function AdminSosPanel({
  isOpen,
  onClose,
  currentUser,
  onOpenAuth,
  onLogout,
  onFocusMapCoord,
  onOpenSupabaseModal,
}: AdminSosPanelProps) {
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'BROADCAST'>('REPORTS');
  const [reports, setReports] = useState<SosReport[]>([]);
  const [broadcasts, setBroadcasts] = useState<EmergencyBroadcast[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [audioAlertsEnabled, setAudioAlertsEnabled] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED'>('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Broadcast Form State
  const [bcTitle, setBcTitle] = useState('URGENT DISASTER ADVISORY: Landslide on Highway');
  const [bcMessage, setBcMessage] = useState('Active boulder fall and road blockage. All vehicles in this radius must halt at safe laybys and await clearance.');
  const [bcDisasterType, setBcDisasterType] = useState('Landslide');
  const [bcSeverity, setBcSeverity] = useState<'CRITICAL' | 'WARNING' | 'ADVISORY'>('CRITICAL');
  const [bcRadiusKm, setBcRadiusKm] = useState<number>(20); // 10, 20, 30 km
  const [bcCenterLat, setBcCenterLat] = useState<number>(30.1472);
  const [bcCenterLng, setBcCenterLng] = useState<number>(78.5884);
  const [bcCenterName, setBcCenterName] = useState('Totaghati Hazard Sector (Km 68)');
  const [isDispatchingBc, setIsDispatchingBc] = useState(false);
  const [bcSuccessMsg, setBcSuccessMsg] = useState<string | null>(null);

  // Polling for live incoming SOS reports
  useEffect(() => {
    if (!isOpen) return;

    fetchReports();
    fetchBroadcasts();
    checkSupabaseStatus().then((s) => setSupabaseConnected(Boolean(s.connected)));

    const interval = setInterval(() => {
      fetchReports(true);
      fetchBroadcasts();
      checkSupabaseStatus().then((s) => setSupabaseConnected(Boolean(s.connected)));
    }, 4000);

    const unsubscribe = subscribeToRealtimeSos(
      (report) => {
        setReports((prev) => {
          if (prev.some((item) => item.id === report.id)) return prev;
          playIncomingSosTone();
          return [report, ...prev];
        });
      },
      (report) => {
        setReports((prev) => prev.map((item) => item.id === report.id ? report : item));
      }
    );

    return () => {
      clearInterval(interval);
      unsubscribe?.();
    };
  }, [isOpen]);

  const playIncomingSosTone = () => {
    if (!audioAlertsEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      // Audio autoplay policy
    }
  };

  const fetchReports = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetch('/api/sos/list');
      const data = await res.json();
      if (data.success && data.reports) {
        setReports((prev) => {
          if (data.reports.length > prev.length && prev.length > 0) {
            playIncomingSosTone();
          }
          return data.reports;
        });
      }
    } catch (err) {
      console.warn('Failed to fetch SOS reports:', err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch('/api/broadcasts/active');
      const data = await res.json();
      if (data.success && data.broadcasts) {
        setBroadcasts(data.broadcasts);
      }
    } catch (err) {
      console.warn('Failed to fetch broadcasts:', err);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED',
    notes?: string
  ) => {
    try {
      const res = await fetch('/api/sos/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, adminNotes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        setReports((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: newStatus, adminNotes: notes } : r))
        );
      }
    } catch (err) {
      console.warn('Failed to update SOS status:', err);
    }
  };

  const handleCreateBroadcastFromReport = (rep: SosReport) => {
    setActiveTab('BROADCAST');
    setBcTitle(`EMERGENCY: ${rep.disasterType} reported at ${rep.nearestLandmark || 'Corridor'}`);
    setBcMessage(`Incident report: "${rep.sosSms}". Stay clear of this sector.`);
    setBcCenterLat(rep.latitude);
    setBcCenterLng(rep.longitude);
    setBcCenterName(rep.nearestLandmark || `Location ${rep.latitude.toFixed(3)}, ${rep.longitude.toFixed(3)}`);
    setBcRadiusKm(20);
    setBcDisasterType(rep.disasterType);
  };

  const handleDispatchBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcMessage.trim()) return;

    setIsDispatchingBc(true);
    setBcSuccessMsg(null);

    try {
      const payload = {
        title: bcTitle,
        message: bcMessage.trim(),
        disasterType: bcDisasterType,
        severity: bcSeverity,
        centerLat: bcCenterLat,
        centerLng: bcCenterLng,
        centerName: bcCenterName,
        radiusKm: bcRadiusKm,
        dispatchedBy: currentUser?.name ? `${currentUser.name} (${currentUser.role})` : 'SDRF Emergency Command',
      };

      const res = await fetch('/api/broadcasts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setBcSuccessMsg(
          data.savedToSupabase
            ? `Geo-fenced SOS SMS alert dispatched and saved for all users within ${bcRadiusKm} km!`
            : `Alert dispatched locally, but not saved to Supabase: ${data.supabaseError || 'database connection is unavailable'}`
        );
        fetchBroadcasts();
        setTimeout(() => setBcSuccessMsg(null), 5000);
      }
    } catch (err) {
      console.error('Broadcast dispatch error:', err);
    } finally {
      setIsDispatchingBc(false);
    }
  };

  const handleDeactivateBroadcast = async (id: string) => {
    try {
      await fetch(`/api/broadcasts/${id}`, { method: 'DELETE' });
      setBroadcasts((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.warn('Failed to deactivate broadcast:', err);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_0_80px_rgba(6,182,212,0.25)] p-5 sm:p-6 text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  State Emergency Operations & SOS Command Center
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL-TIME SATELLITE DISPATCH
                </span>
              </div>
              <p className="text-xs text-slate-400">
                SDRF, Border Roads Organisation (BRO) & NH-58 Incident Triage Terminal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenSupabaseModal && (
              <button
                id="admin-supabase-hub-btn"
                type="button"
                onClick={onOpenSupabaseModal}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  supabaseConnected
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-800 border-white/10 text-slate-300 hover:text-white'
                }`}
                title="Manage Supabase PostgreSQL Connection & Sync"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Supabase DB</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    supabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
              </button>
            )}

            <button
              onClick={() => setAudioAlertsEnabled(!audioAlertsEnabled)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                audioAlertsEnabled
                  ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 border-white/10 text-slate-400'
              }`}
              title={audioAlertsEnabled ? 'Incoming audio siren active' : 'Audio siren muted'}
            >
              {audioAlertsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{audioAlertsEnabled ? 'Siren ON' : 'Muted'}</span>
            </button>

            <button
              onClick={() => fetchReports()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors cursor-pointer"
              title="Refresh reports"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/70 border border-red-500/40 text-red-200 transition-colors cursor-pointer"
              title="Log out admin and switch account"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-white/10 py-3 gap-2 flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('REPORTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'REPORTS'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Incoming SOS Distress Reports</span>
              {pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center animate-bounce">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('BROADCAST')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'BROADCAST'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Geo-Fenced SOS SMS Broadcast Dispatcher</span>
              {broadcasts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono">
                  {broadcasts.length} Active
                </span>
              )}
            </button>
          </div>

          {activeTab === 'REPORTS' && (
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Filter:</span>
              {(['ALL', 'PENDING', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">

          {/* TAB 1: INCOMING SOS REPORTS FEED */}
          {activeTab === 'REPORTS' && (
            <div className="space-y-3">
              {filteredReports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="text-sm font-semibold text-white">No distress alerts under this filter.</p>
                  <p className="text-xs text-slate-400">Highway sector radar running continuously.</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      report.status === 'PENDING'
                        ? 'bg-red-950/40 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
                        : report.status === 'ACKNOWLEDGED'
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : report.status === 'DISPATCHED'
                        ? 'bg-blue-950/30 border-blue-500/40'
                        : 'bg-slate-900/80 border-white/10 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      
                      {/* Left: Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-red-600 text-white">
                            {report.disasterType}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              report.status === 'PENDING'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                                : report.status === 'ACKNOWLEDGED'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : report.status === 'DISPATCHED'
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            STATUS: {report.status}
                          </span>

                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(report.createdAt).toLocaleTimeString()}
                          </span>

                          <span className="text-[10px] font-mono text-slate-400">
                            #{report.id.substring(0, 16)}
                          </span>
                        </div>

                        {/* SOS SMS Message text */}
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10">
                          <div className="text-[10px] text-red-400 font-bold uppercase mb-1">
                            SOS SMS DISTRESS MESSAGE:
                          </div>
                          <div className="text-sm font-semibold text-white leading-relaxed">
                            "{report.sosSms}"
                          </div>
                        </div>

                        {/* Contact info & Location */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
                            <div className="text-[10px] text-slate-400">Reporter Contact (Supabase User)</div>
                            <div className="text-white font-medium">{report.userName || 'Commuter'}</div>
                            <div className="flex items-center gap-2">
                              <a
                                href={`tel:${report.userMobile}`}
                                className="text-emerald-400 font-mono font-bold flex items-center gap-1 hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5" /> {report.userMobile}
                              </a>
                            </div>
                            <div className="text-slate-400 text-[11px] flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3" /> {report.userEmail}
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
                            <div className="text-[10px] text-slate-400">Locked GPS Location</div>
                            <div className="text-cyan-300 font-mono font-bold flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                              {report.latitude.toFixed(4)}°N, {report.longitude.toFixed(4)}°E (±{report.accuracyMeters}m)
                            </div>
                            <div className="text-white text-[11px] font-medium truncate">
                              {report.nearestLandmark}
                            </div>
                            {onFocusMapCoord && (
                              <button
                                type="button"
                                onClick={() => onFocusMapCoord(report.latitude, report.longitude)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline pt-0.5 cursor-pointer"
                              >
                                <ExternalLink className="w-3 h-3" /> Focus on Radar Map
                              </button>
                            )}
                          </div>
                        </div>

                        {report.adminNotes && (
                          <div className="text-xs text-cyan-300 bg-cyan-950/40 p-2 rounded-xl border border-cyan-500/30">
                            <strong>Command Triage Note:</strong> {report.adminNotes}
                          </div>
                        )}
                      </div>

                      {/* Right: Live Camera Photo Snapshot & Action Buttons */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-3 shrink-0">
                        {report.photoDataUrl ? (
                          <div
                            onClick={() => setSelectedPhoto(report.photoDataUrl)}
                            className="relative w-36 h-28 rounded-xl overflow-hidden border-2 border-cyan-500/50 cursor-pointer group shadow-md"
                            title="Click to expand full live snapshot"
                          >
                            <img
                              src={report.photoDataUrl}
                              alt="Live SOS Site Photo"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-white bg-black/80 px-2 py-0.5 rounded-md font-mono">
                                Zoom Photo
                              </span>
                            </div>
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-emerald-300 font-mono">
                              Live Snapshot
                            </div>
                          </div>
                        ) : (
                          <div className="w-36 h-24 rounded-xl bg-slate-950 border border-white/10 flex flex-col items-center justify-center text-slate-500 text-xs">
                            <Camera className="w-5 h-5 mb-1" />
                            <span>No Live Snapshot</span>
                          </div>
                        )}

                        {/* Status Action Buttons */}
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                          {report.status === 'PENDING' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'ACKNOWLEDGED', 'SDRF Quick Response Team Notified')}
                              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow transition-colors cursor-pointer"
                            >
                              Acknowledge (SDRF)
                            </button>
                          )}

                          {report.status !== 'DISPATCHED' && report.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'DISPATCHED', 'BRO Earthmover & Medical Team dispatched to site')}
                              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow transition-colors cursor-pointer"
                            >
                              Dispatch Team
                            </button>
                          )}

                          {report.status !== 'RESOLVED' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'RESOLVED', 'Debris cleared, sector declared safe for one-way traffic')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
                            >
                              Mark Resolved
                            </button>
                          )}

                          {/* Quick trigger broadcast from incident */}
                          <button
                            onClick={() => handleCreateBroadcastFromReport(report)}
                            className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Geo-Alert Area</span>
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: GEO-FENCED SOS SMS BROADCAST DISPATCHER */}
          {activeTab === 'BROADCAST' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Form: Compose Broadcast */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-red-500/40 space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-red-500" />
                      Compose Real-Time Geo-Fenced SOS SMS Broadcast
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Only travelers whose live GPS is inside the selected radius (10km, 20km, 30km) will receive the emergency popup on their screen.
                    </p>
                  </div>

                  <form onSubmit={handleDispatchBroadcast} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Broadcast Headline / Title
                      </label>
                      <input
                        type="text"
                        required
                        value={bcTitle}
                        onChange={(e) => setBcTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Emergency SOS SMS Warning Message
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={bcMessage}
                        onChange={(e) => setBcMessage(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-900 border border-red-500/30 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400 font-sans"
                        placeholder="Type urgent evacuation or halt instruction..."
                      />
                    </div>

                    {/* LOCATION OPTION: 10 KM, 20 KM, 30 KM RADIUS */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-2">
                      <label className="block text-xs font-bold text-cyan-300 flex items-center justify-between">
                        <span>Geo-Fence Warning Radius (Location Option)</span>
                        <span className="text-white font-mono bg-cyan-950 px-2 py-0.5 rounded-lg border border-cyan-500/40">
                          {bcRadiusKm} km Radius
                        </span>
                      </label>

                      <div className="grid grid-cols-3 gap-2">
                        {[10, 20, 30].map((km) => (
                          <button
                            key={km}
                            type="button"
                            onClick={() => setBcRadiusKm(km)}
                            className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all text-center cursor-pointer ${
                              bcRadiusKm === km
                                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                : 'bg-slate-800 border-white/10 text-slate-300 hover:text-white hover:bg-slate-700'
                            }`}
                          >
                            {km} km Area
                            <span className="block text-[9px] font-normal opacity-75">
                              {km === 10 ? 'Immediate Danger' : km === 20 ? 'Sector Zone' : 'Corridor Regional'}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Custom radius slider */}
                      <div className="pt-1 flex items-center gap-3">
                        <span className="text-[10px] text-slate-400">Custom Radius:</span>
                        <input
                          type="range"
                          min="5"
                          max="50"
                          step="1"
                          value={bcRadiusKm}
                          onChange={(e) => setBcRadiusKm(Number(e.target.value))}
                          className="flex-1 accent-cyan-400 cursor-pointer"
                        />
                        <span className="text-[10px] text-cyan-300 font-mono w-10">{bcRadiusKm} km</span>
                      </div>
                    </div>

                    {/* Epicenter Coordinate Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Epicenter Sector Name
                        </label>
                        <input
                          type="text"
                          value={bcCenterName}
                          onChange={(e) => setBcCenterName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Severity Level
                        </label>
                        <select
                          value={bcSeverity}
                          onChange={(e) => setBcSeverity(e.target.value as any)}
                          className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                        >
                          <option value="CRITICAL">🔴 CRITICAL (Immediate Evacuate)</option>
                          <option value="WARNING">🟠 WARNING (Halt & Standby)</option>
                          <option value="ADVISORY">🟡 ADVISORY (Proceed with Caution)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Corridor Stations Epicenter Presets */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block">Corridor Key Points Epicenter:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { name: 'Totaghati (Km 68)', lat: 30.1472, lng: 78.5884 },
                          { name: 'Devprayag (Km 68)', lat: 30.1470, lng: 78.6015 },
                          { name: 'Byasi Gorge (Km 34)', lat: 30.1340, lng: 78.3890 },
                          { name: 'Rudraprayag (Km 124)', lat: 30.2872, lng: 78.9835 },
                          { name: 'Joshimath (Km 188)', lat: 30.5578, lng: 79.5665 },
                        ].map((pt) => (
                          <button
                            key={pt.name}
                            type="button"
                            onClick={() => {
                              setBcCenterLat(pt.lat);
                              setBcCenterLng(pt.lng);
                              setBcCenterName(pt.name);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                              bcCenterLat === pt.lat && bcCenterLng === pt.lng
                                ? 'bg-red-500/25 border-red-400 text-white'
                                : 'bg-slate-800 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {pt.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {bcSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>{bcSuccessMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isDispatchingBc}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-extrabold shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
                    >
                      {isDispatchingBc ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Dispatching Broadcast...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>DISPATCH GEO-FENCED BROADCAST POPUP ({bcRadiusKm} KM)</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Panel: Active Broadcasts List */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-3 h-full">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-amber-400" />
                      Active Real-Time Broadcasts ({broadcasts.length})
                    </h3>
                    <span className="text-[10px] text-cyan-400">Broadcasting Now</span>
                  </div>

                  <div className="space-y-2.5 max-h-[450px] overflow-y-auto pr-1">
                    {broadcasts.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-900 text-center text-xs text-slate-400">
                        No active broadcasts dispatched yet.
                      </div>
                    ) : (
                      broadcasts.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-slate-900 border border-red-500/30 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-red-300">{b.title}</span>
                            <button
                              onClick={() => handleDeactivateBroadcast(b.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/50 transition-colors"
                              title="Deactivate broadcast"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs text-slate-200">"{b.message}"</p>

                          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
                            <span className="text-cyan-300 font-mono">Radius: {b.radiusKm} km</span>
                            <span>Epicenter: {b.centerName}</span>
                            <span>{new Date(b.createdAt).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal for viewing full captured live photo */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-2xl w-full">
              <img
                src={selectedPhoto}
                alt="Enlarged Live Site Photo"
                className="w-full rounded-2xl border-2 border-cyan-400 shadow-2xl object-contain max-h-[85vh]"
              />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
