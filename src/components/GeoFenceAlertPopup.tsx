import React, { useState, useEffect } from 'react';
import { EmergencyBroadcast } from '../types';
import { subscribeToRealtimeBroadcasts } from '../utils/supabaseClient';
import { 
  AlertOctagon, 
  MapPin, 
  Radio, 
  Volume2, 
  X, 
  ShieldAlert, 
  Navigation,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface GeoFenceAlertPopupProps {
  userLat: number;
  userLng: number;
}

interface MatchingBroadcastWithDist extends EmergencyBroadcast {
  userDistanceKm: number;
  isInsideZone: boolean;
}

export function GeoFenceAlertPopup({ userLat, userLng }: GeoFenceAlertPopupProps) {
  const [activeAlert, setActiveAlert] = useState<MatchingBroadcastWithDist | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Periodically check server for geo-fenced broadcasts matching this user's GPS
  useEffect(() => {
    if (!userLat || !userLng) return;

    const checkGeoFencing = async () => {
      try {
        const res = await fetch(`/api/broadcasts/check?lat=${userLat}&lng=${userLng}`);
        const data = await res.json();

        if (data.success && data.matchingBroadcasts && data.matchingBroadcasts.length > 0) {
          // Find the first broadcast that hasn't been dismissed by this user
          const undismissed = data.matchingBroadcasts.find(
            (b: MatchingBroadcastWithDist) => !dismissedIds.has(b.id)
          );

          if (undismissed) {
            setActiveAlert(undismissed);
            playEmergencyTone();
          } else {
            setActiveAlert(null);
          }
        } else {
          // Outside of all active warning zones: no popup!
          setActiveAlert(null);
        }
      } catch (err) {
        // Silently catch background poll issues
      }
    };

    checkGeoFencing();
    const interval = setInterval(checkGeoFencing, 5000);

    const unsubscribe = subscribeToRealtimeBroadcasts((broadcast) => {
      const distance = haversineDistanceKm(userLat, userLng, broadcast.centerLat, broadcast.centerLng);
      if (distance <= broadcast.radiusKm && !dismissedIds.has(broadcast.id)) {
        setActiveAlert({ ...broadcast, userDistanceKm: distance, isInsideZone: true });
        playEmergencyTone();
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe?.();
    };
  }, [userLat, userLng, dismissedIds]);

  const haversineDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const radians = Math.PI / 180;
    const dLat = (lat2 - lat1) * radians;
    const dLng = (lng2 - lng1) * radians;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const playEmergencyTone = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, audioCtx.currentTime);
      osc.frequency.setValueAtTime(450, audioCtx.currentTime + 0.2);
      osc.frequency.setValueAtTime(750, audioCtx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.7);
    } catch (e) {
      // Audio autoplay policy
    }
  };

  const handleDismiss = () => {
    if (activeAlert) {
      setDismissedIds((prev) => new Set([...prev, activeAlert.id]));
      setActiveAlert(null);
    }
  };

  if (!activeAlert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-4 border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.7)] p-6 text-white animate-in zoom-in-95 duration-200">
        
        {/* Animated Emergency Beacon */}
        <div className="flex items-center justify-between pb-4 border-b border-red-500/40">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-red-600 text-white shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-red-500 text-slate-950 uppercase tracking-wider animate-bounce">
                  EMERGENCY GEO-FENCE WARNING
                </span>
                <span className="text-xs text-red-400 font-mono">
                  {activeAlert.radiusKm} KM RADIUS
                </span>
              </div>
              <h2 className="text-base font-extrabold tracking-tight text-white mt-0.5">
                {activeAlert.title}
              </h2>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core Distress SMS Content */}
        <div className="my-5 space-y-4">
          <div className="p-4 rounded-2xl bg-red-950/60 border-2 border-red-500/50 space-y-1.5 shadow-inner">
            <div className="text-[11px] font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-red-400 animate-ping" />
              <span>OFFICIAL EMERGENCY BROADCAST SMS</span>
            </div>
            <p className="text-sm font-bold text-white leading-relaxed font-sans">
              "{activeAlert.message}"
            </p>
          </div>

          {/* Geo-proximity Warning Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-red-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>You are INSIDE the danger zone:</span>
              </span>
              <span className="font-mono font-bold text-white text-sm bg-red-600/30 px-2 py-0.5 rounded-lg border border-red-500/40">
                {activeAlert.userDistanceKm.toFixed(1)} km from epicenter
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-[11px]">
              <div>
                <span className="text-slate-400 block">Epicenter Sector:</span>
                <strong className="text-cyan-300 font-medium">{activeAlert.centerName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Broadcast Authority:</span>
                <strong className="text-white font-medium">{activeAlert.dispatchedBy}</strong>
              </div>
            </div>
          </div>

          {/* Immediate Action Protocol */}
          <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1">
            <strong className="block text-amber-300">IMMEDIATE SAFETY ACTIONS:</strong>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-100">
              <li>Pull over to a designated wide mountain layby away from vertical rock faces.</li>
              <li>Do not attempt to ford moving debris, mudflows, or swollen mountain torrents.</li>
              <li>Maintain radio and cellular standby. Await SDRF / BRO heavy equipment clearance.</li>
            </ul>
          </div>
        </div>

        {/* Acknowledge Button */}
        <button
          onClick={handleDismiss}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-red-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>I ACKNOWLEDGE & UNDERSTAND HAZARD PROTOCOL</span>
        </button>

      </div>
    </div>
  );
}
