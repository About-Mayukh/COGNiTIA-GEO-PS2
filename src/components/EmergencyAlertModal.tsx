import React from 'react';
import { ShieldAlert, AlertTriangle, AlertOctagon, X, PhoneCall, Radio, Truck } from 'lucide-react';
import { HighwaySegment, SegmentRiskTelemetry } from '../types';

interface EmergencyAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  unstableSegments: { seg: HighwaySegment; tel: SegmentRiskTelemetry }[];
  onInspectSegment: (id: string) => void;
}

export const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  isOpen,
  onClose,
  unstableSegments,
  onInspectSegment,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-rose-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-rose-500 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.4)] overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        {/* Warning Banner Top */}
        <div className="bg-rose-600 px-6 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-sm sm:text-base tracking-wider uppercase">
            <ShieldAlert className="w-5 h-5 animate-bounce" />
            <span>[MODAL TRIGGER: HIGH-PRIORITY COLLAPSE WARNING]</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-rose-700 rounded transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs font-mono text-slate-200 max-h-[75vh] overflow-y-auto">
          <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-200 space-y-1">
            <div className="font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Critical Geotechnical Limit Equilibrium Violation Detected
            </div>
            <p className="text-[11px] text-rose-200/90 leading-relaxed">
              Resisting shear strength along the failure plane has fallen below the active driving shear stress 
              ($\tau_{'{resist}'} &lt; \tau_{'{drive}'}$, $\text{'{FoS}'} &lt; 1.00$). Heightened probability of catastrophic debris flow / rockfall onto highway alignment.
            </p>
          </div>

          <div>
            <div className="font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Impacted Highway Sections ({unstableSegments.length})</span>
              <span className="text-rose-400">NH-58 Mountain Corridor</span>
            </div>

            <div className="space-y-2">
              {unstableSegments.map(({ seg, tel }) => (
                <div
                  key={seg.id}
                  onClick={() => {
                    onInspectSegment(seg.id);
                    onClose();
                  }}
                  className="p-3 bg-slate-950 rounded-xl border border-rose-500/30 hover:border-rose-500 hover:bg-slate-900 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-2">
                      <span>{seg.name}</span>
                      <span className="text-rose-400 font-bold bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-500/30 text-[10px]">
                        FoS {tel.fos.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>{seg.code}</span>
                      <span>Km {seg.chainageKm}</span>
                      <span>Slope: {seg.slopeBeta}&deg;</span>
                      <span className="text-cyan-400">u(t): {tel.porePressureKpa.toFixed(1)} kPa</span>
                    </div>
                  </div>

                  <button className="px-3 py-1 text-xs rounded bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-semibold">
                    Inspect &rarr;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SOP Emergency Actions */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="font-bold text-slate-300 uppercase text-[11px] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Standard Operating Procedure (SOP) Action Mandate
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-400">
              <li className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Issue immediate vehicular traffic stoppage at nearest highway checkpoint barriers.</span>
              </li>
              <li className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Trigger highway acoustic landslide warning sirens and variable electronic message boards (VMS).</span>
              </li>
              <li className="flex items-center gap-2">
                <PhoneCall className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Alert Border Roads Organisation (BRO) Task Force & SDRF Rapid Response clearance units.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <span className="text-[10px] text-slate-500 font-mono">
            COGNITIA 2026 Emergency Alert System
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
          >
            Acknowledge Hazard Alert
          </button>
        </div>
      </div>
    </div>
  );
};
