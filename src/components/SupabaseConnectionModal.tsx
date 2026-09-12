import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Shield,
  Radio,
  FileCode,
  UploadCloud,
  Zap,
  Download,
  Eye,
  Layers,
  Phone,
  MapPin,
  Clock,
  User,
  Camera,
  AlertOctagon,
} from 'lucide-react';
import {
  getSupabaseConfig,
  checkSupabaseStatus,
  configureSupabaseBothSides,
  syncBaselineData,
  fetchSchemaSql,
  fetchAllSupabaseData,
  syncAllBidirectional,
} from '../utils/supabaseClient';

interface SupabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: () => void;
}

export const SupabaseConnectionModal: React.FC<SupabaseConnectionModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'explorer' | 'config' | 'schema'>('status');
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<{
    isConfigured: boolean;
    connected: boolean;
    url: string | null;
    latencyMs?: number;
    tables?: { sos_reports: boolean; emergency_broadcasts: boolean; profiles: boolean };
    counts?: { sosReports: number; broadcasts: number };
    error?: string | null;
  } | null>(null);

  const [loadingStatus, setLoadingStatus] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [schemaSql, setSchemaSql] = useState('');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Live Explorer Data
  const [allData, setAllData] = useState<{
    sosReports: any[];
    broadcasts: any[];
    profiles: any[];
  } | null>(null);
  const [explorerFilter, setExplorerFilter] = useState<'ALL' | 'SOS' | 'BROADCASTS' | 'PROFILES'>('ALL');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrlInput(cfg.url);
      setKeyInput(cfg.key);
      refreshStatus();
      loadSchema();
      // Auto-fetch data on modal open
      handleFetchAllData(true);
    }
  }, [isOpen]);

  const refreshStatus = async () => {
    setLoadingStatus(true);
    try {
      const s = await checkSupabaseStatus();
      setStatus(s);
    } catch {
      setStatus({ isConfigured: false, connected: false, url: null });
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadSchema = async () => {
    const sql = await fetchSchemaSql();
    setSchemaSql(sql);
  };

  const handleFetchAllData = async (silent = false) => {
    setFetchingAll(true);
    if (!silent) setSaveMessage(null);
    try {
      const res = await fetchAllSupabaseData();
      if (res.success) {
        setAllData(res.data);
        if (!silent) {
          setSaveMessage({
            type: 'success',
            text: `Successfully fetched all data from Supabase! (${res.counts.sosReports} SOS Reports, ${res.counts.broadcasts} Broadcasts, ${res.counts.profiles} Profiles)`,
          });
        }
        await refreshStatus();
        if (onConfigUpdated) onConfigUpdated();
      } else if (!silent) {
        setSaveMessage({ type: 'error', text: res.message || 'Failed to fetch Supabase data' });
      }
    } catch (err: any) {
      if (!silent) setSaveMessage({ type: 'error', text: err?.message || 'Error fetching data' });
    } finally {
      setFetchingAll(false);
    }
  };

  const handleSyncAllBidirectional = async () => {
    setSyncingData(true);
    setSaveMessage(null);
    try {
      const res = await syncAllBidirectional();
      if (res.success) {
        setSaveMessage({
          type: 'success',
          text: res.message || 'Bi-directional synchronization complete!',
        });
        await handleFetchAllData(true);
        if (onConfigUpdated) onConfigUpdated();
      } else {
        setSaveMessage({ type: 'error', text: res.error || 'Sync failed' });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Sync error' });
    } finally {
      setSyncingData(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !keyInput.trim()) {
      setSaveMessage({ type: 'error', text: 'Please enter both Supabase Project URL and Key.' });
      return;
    }

    setSavingConfig(true);
    setSaveMessage(null);
    try {
      const res = await configureSupabaseBothSides(urlInput.trim(), keyInput.trim());
      if (res.success) {
        setSaveMessage({
          type: 'success',
          text: res.message || 'Supabase credentials saved & client initialized successfully!',
        });
        await refreshStatus();
        await handleFetchAllData(true);
        if (onConfigUpdated) onConfigUpdated();
      } else {
        setSaveMessage({ type: 'error', text: res.error || 'Failed to initialize with provided keys.' });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Configuration error' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSyncBaseline = async () => {
    setSyncingData(true);
    setSaveMessage(null);
    try {
      const res = await syncBaselineData();
      if (res.success) {
        setSaveMessage({ type: 'success', text: res.message || 'Baseline data synced to Supabase successfully!' });
        await refreshStatus();
        await handleFetchAllData(true);
        if (onConfigUpdated) onConfigUpdated();
      } else {
        setSaveMessage({ type: 'error', text: res.error || 'Failed to sync data' });
      }
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err?.message || 'Sync failed' });
    } finally {
      setSyncingData(false);
    }
  };

  const copySchemaToClipboard = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div
      id="supabase_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="supabase_modal_container"
        className="w-full max-w-4xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Supabase PostgreSQL & Data Management Hub
                </h2>
                {status?.connected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    POSTGRESQL CONNECTED
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Radio className="w-3 h-3 mr-1 animate-pulse" />
                    BUFFER MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized persistence for SOS SMS distress reports, camera evidence, mobile auth, and geo-fenced broadcasts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="supabase_fetch_all_header_btn"
              onClick={() => handleFetchAllData(false)}
              disabled={fetchingAll}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              title="Fetch all live records from Supabase tables"
            >
              <Download className={`w-3.5 h-3.5 ${fetchingAll ? 'animate-bounce' : ''}`} />
              <span>{fetchingAll ? 'Fetching...' : 'Fetch All Data'}</span>
            </button>

            <button
              id="supabase_modal_close_btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-xs font-medium border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'status'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Connection & Health</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`py-3 px-4 text-xs font-medium border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'explorer'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Data Explorer</span>
            {allData && (
              <span className="text-[10px] bg-slate-800 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-500/30 font-mono">
                {allData.sosReports.length + allData.broadcasts.length + allData.profiles.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-xs font-medium border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>API Credentials</span>
          </button>

          <button
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-4 text-xs font-medium border-b-2 flex items-center space-x-2 transition-colors whitespace-nowrap ${
              activeTab === 'schema'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>SQL Schema & RLS</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Notifications */}
          {saveMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              )}
              <div className="flex-1 font-medium leading-relaxed">{saveMessage.text}</div>
            </div>
          )}

          {/* TAB 1: STATUS & HEALTH */}
          {activeTab === 'status' && (
            <div className="space-y-5">
              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleFetchAllData(false)}
                  disabled={fetchingAll}
                  className="p-3.5 bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 border border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-emerald-400 mb-1">
                    <Download className={`w-4 h-4 ${fetchingAll ? 'animate-spin' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 px-1.5 py-0.5 rounded">Action</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Fetch All Supabase Data</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Read all rows from all 3 tables directly into the dashboard.</p>
                </button>

                <button
                  onClick={handleSyncAllBidirectional}
                  disabled={syncingData || !status?.connected}
                  className="p-3.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 hover:from-blue-600/40 hover:to-indigo-600/40 border border-blue-500/40 rounded-xl text-left transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between text-blue-400 mb-1">
                    <UploadCloud className={`w-4 h-4 ${syncingData ? 'animate-spin' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 px-1.5 py-0.5 rounded">2-Way</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Bi-Directional Sync</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Push pending local buffer & retrieve latest from cloud.</p>
                </button>

                <button
                  onClick={() => setActiveTab('explorer')}
                  className="p-3.5 bg-gradient-to-r from-cyan-600/30 to-sky-600/30 hover:from-cyan-600/40 hover:to-sky-600/40 border border-cyan-500/40 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-cyan-400 mb-1">
                    <Eye className="w-4 h-4 group-hover:scale-110" />
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-cyan-500/20 px-1.5 py-0.5 rounded">Viewer</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Open Live Data Explorer</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Inspect raw records, coordinates, photos, and SMS texts.</p>
                </button>
              </div>

              {/* Connection Status Card */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Live Supabase Infrastructure
                  </span>
                  <button
                    onClick={refreshStatus}
                    disabled={loadingStatus}
                    className="flex items-center space-x-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
                    <span>Ping Supabase</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1">Database State</span>
                    <div className="flex items-center space-x-1.5">
                      <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                      <span className="font-semibold text-slate-200">
                        {status?.connected ? 'Active PostgreSQL' : 'Local Fallback'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1">Network Latency</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {status?.latencyMs !== undefined ? `${status.latencyMs} ms` : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1">SOS Reports</span>
                    <span className="font-mono font-bold text-red-300">
                      {status?.counts?.sosReports ?? (allData?.sosReports.length || 0)} records
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 block mb-1">Active Broadcasts</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {status?.counts?.broadcasts ?? (allData?.broadcasts.length || 0)} alerts
                    </span>
                  </div>
                </div>

                {status?.url && (
                  <div className="text-xs text-slate-400 break-all bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 font-mono flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-bold">Cloud Endpoint URL</span>
                      {status.url}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      TLS Verified
                    </span>
                  </div>
                )}
              </div>

              {/* Table Schema Readiness */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Supabase PostgreSQL Tables
                </span>

                <div className="space-y-2">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-white font-mono">sos_reports</span>
                          <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {allData?.sosReports.length ?? status?.counts?.sosReports ?? 0} rows
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Latitude, Longitude, Photo Base64, SMS Message, Mobile Number, Chainage
                        </p>
                      </div>
                    </div>
                    {status?.tables?.sos_reports ? (
                      <span className="text-xs text-emerald-400 flex items-center font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Buffered</span>
                    )}
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-white font-mono">emergency_broadcasts</span>
                          <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {allData?.broadcasts.length ?? status?.counts?.broadcasts ?? 0} active
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Admin Radius Alerts (10km, 20km, 30km geo-fence targeting)
                        </p>
                      </div>
                    </div>
                    {status?.tables?.emergency_broadcasts ? (
                      <span className="text-xs text-emerald-400 flex items-center font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Buffered</span>
                    )}
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-white font-mono">profiles</span>
                          <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
                            {allData?.profiles.length ?? 0} accounts
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          User emergency mobile number directory & responder roles
                        </p>
                      </div>
                    </div>
                    {status?.tables?.profiles ? (
                      <span className="text-xs text-emerald-400 flex items-center font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Buffered</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sync Baseline CTA */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-emerald-300">Populate Initial Corridor Baseline</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Insert baseline NH-58 incident distress records and active geo-fence radius warnings to Supabase
                  </p>
                </div>
                <button
                  id="supabase_sync_baseline_btn"
                  onClick={handleSyncBaseline}
                  disabled={syncingData || !status?.connected}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${syncingData ? 'animate-spin' : ''}`} />
                  <span>{syncingData ? 'Syncing...' : 'Sync to Supabase'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE DATA EXPLORER */}
          {activeTab === 'explorer' && (
            <div className="space-y-4">
              {/* Explorer Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setExplorerFilter('ALL')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      explorerFilter === 'ALL'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    All Tables ({ (allData?.sosReports.length || 0) + (allData?.broadcasts.length || 0) + (allData?.profiles.length || 0) })
                  </button>
                  <button
                    onClick={() => setExplorerFilter('SOS')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      explorerFilter === 'SOS'
                        ? 'bg-red-500 text-white font-bold'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    SOS Reports ({ allData?.sosReports.length || 0 })
                  </button>
                  <button
                    onClick={() => setExplorerFilter('BROADCASTS')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      explorerFilter === 'BROADCASTS'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    Broadcasts ({ allData?.broadcasts.length || 0 })
                  </button>
                  <button
                    onClick={() => setExplorerFilter('PROFILES')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      explorerFilter === 'PROFILES'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    Profiles ({ allData?.profiles.length || 0 })
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFetchAllData(false)}
                    disabled={fetchingAll}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors border border-slate-700"
                  >
                    <RefreshCw className={`w-3 h-3 ${fetchingAll ? 'animate-spin' : ''}`} />
                    <span>Refresh Feed</span>
                  </button>
                </div>
              </div>

              {/* Data Lists */}
              <div className="space-y-4">
                {/* 1. SOS Reports Table */}
                {(explorerFilter === 'ALL' || explorerFilter === 'SOS') && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Radio className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          SOS Reports ({allData?.sosReports.length || 0})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">public.sos_reports</span>
                    </div>

                    <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                      {!allData?.sosReports || allData.sosReports.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No SOS reports found in database. Click "Sync Baseline" or submit an emergency SOS.
                        </div>
                      ) : (
                        allData.sosReports.map((rep: any) => (
                          <div key={rep.id} className="p-3.5 hover:bg-slate-900/50 transition-colors flex items-start justify-between gap-3 text-xs">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rep.status === 'PENDING' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                  rep.status === 'ACKNOWLEDGED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {rep.status}
                                </span>
                                <span className="font-bold text-white">{rep.disasterType}</span>
                                <span className="text-slate-400 font-mono text-[11px]">• {rep.userEmail}</span>
                                <span className="text-emerald-400 font-mono text-[11px] flex items-center">
                                  <Phone className="w-3 h-3 mr-0.5" /> {rep.userMobile}
                                </span>
                              </div>

                              <p className="text-slate-300 font-sans italic bg-slate-900/80 p-2 rounded border border-slate-800/60">
                                "{rep.sosSms}"
                              </p>

                              <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono flex-wrap">
                                <span className="flex items-center text-cyan-300">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  GPS: {Number(rep.latitude).toFixed(4)}, {Number(rep.longitude).toFixed(4)}
                                </span>
                                {rep.nearestLandmark && (
                                  <span>Near: {rep.nearestLandmark}</span>
                                )}
                                {rep.nearestChainageKm !== undefined && (
                                  <span>Km {rep.nearestChainageKm}</span>
                                )}
                                <span className="text-slate-500">
                                  {new Date(rep.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>

                            {/* Camera Snapshot thumbnail */}
                            {rep.photoDataUrl && (
                              <button
                                onClick={() => setPreviewPhoto(rep.photoDataUrl)}
                                className="relative rounded-lg overflow-hidden border border-slate-700 w-16 h-16 shrink-0 group hover:border-emerald-400 transition-colors"
                              >
                                <img src={rep.photoDataUrl} alt="SOS Evidence" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Emergency Broadcasts Table */}
                {(explorerFilter === 'ALL' || explorerFilter === 'BROADCASTS') && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-amber-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Emergency Geo-Fenced Broadcasts ({allData?.broadcasts.length || 0})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">public.emergency_broadcasts</span>
                    </div>

                    <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                      {!allData?.broadcasts || allData.broadcasts.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No active emergency broadcasts.
                        </div>
                      ) : (
                        allData.broadcasts.map((bc: any) => (
                          <div key={bc.id} className="p-3.5 hover:bg-slate-900/50 transition-colors text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  bc.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                  'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {bc.severity}
                                </span>
                                <span className="font-bold text-white">{bc.title}</span>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                                Radius: {bc.radiusKm} km
                              </span>
                            </div>

                            <p className="text-slate-300">{bc.message}</p>

                            <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono flex-wrap">
                              <span className="text-cyan-300">Epicenter: {bc.centerName}</span>
                              <span>Coord: {Number(bc.centerLat).toFixed(3)}, {Number(bc.centerLng).toFixed(3)}</span>
                              <span className="text-slate-500">By: {bc.dispatchedBy}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 3. User Profiles Table */}
                {(explorerFilter === 'ALL' || explorerFilter === 'PROFILES') && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          User Profiles ({allData?.profiles.length || 0})
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">public.profiles</span>
                    </div>

                    <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto">
                      {!allData?.profiles || allData.profiles.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500">
                          No registered user profiles found in Supabase.
                        </div>
                      ) : (
                        allData.profiles.map((p: any) => (
                          <div key={p.id} className="p-3 hover:bg-slate-900/50 transition-colors flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-white">{p.full_name || 'User'}</span>
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded uppercase font-mono">
                                  {p.role || 'user'}
                                </span>
                              </div>
                              <span className="text-slate-400 font-mono text-[11px] block">{p.email}</span>
                            </div>

                            <div className="text-right">
                              <span className="text-emerald-400 font-mono font-semibold flex items-center justify-end">
                                <Phone className="w-3 h-3 mr-1" /> {p.mobile_number}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Registered: {new Date(p.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CREDENTIAL CONFIGURATION */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Supabase Project URL
                </label>
                <input
                  id="supabase_input_url"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://your-project-id.supabase.co"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Supabase Public Anon Key or Service Role Key
                </label>
                <textarea
                  id="supabase_input_key"
                  rows={3}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Found in your Supabase Dashboard under <strong>Project Settings → API</strong>.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
                >
                  <span>Open Supabase Dashboard</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  id="supabase_save_credentials_btn"
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  <Zap className={`w-3.5 h-3.5 ${savingConfig ? 'animate-spin' : ''}`} />
                  <span>{savingConfig ? 'Connecting & Verifying...' : 'Save & Connect Supabase'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SQL SCHEMA & RLS */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">PostgreSQL Schema & Security Rules</h4>
                  <p className="text-[11px] text-slate-400">
                    Paste this into the Supabase SQL Editor to provision tables, indexes, RLS, and Realtime publication.
                  </p>
                </div>
                <button
                  id="supabase_copy_schema_btn"
                  onClick={copySchemaToClipboard}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors border border-slate-700 cursor-pointer"
                >
                  {copiedSchema ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Schema SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-emerald-300/90 font-mono overflow-x-auto max-h-80 leading-relaxed selection:bg-emerald-900 selection:text-white">
                  {schemaSql || '-- Loading schema definition...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted transmission & Realtime WebSocket synchronization</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close Hub
          </button>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 p-2">
            <img src={previewPhoto} alt="Disaster Evidence" className="w-full h-auto rounded-xl" />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
