import React from 'react';
import { X, AlertTriangle, ShieldCheck, HelpCircle, Layers, Cpu, Compass } from 'lucide-react';

interface LimitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LimitationsModal: React.FC<LimitationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950/70 border border-cyan-500/40 text-cyan-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-slate-100">
                Methodological Disclosures & Operational Screening Limitations
              </h2>
              <p className="text-xs font-mono text-slate-400">
                COGNITIA 2026 GEOSPATIAL-PS2 Geotechnical Governance Protocol
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs font-mono leading-relaxed">
          {/* Executive Notice */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300 uppercase tracking-wider mb-1">
                Regional Screening Tool Notice
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                This system operates as a regional-scale highway corridor screening and patrol prioritization tool. 
                It is physically grounded in recognized limit equilibrium mechanics, but <b>MUST NEVER</b> be treated as a replacement 
                for downhole borehole drilling, in-situ inclinometers, or site-specific geotechnical slope engineering designs.
              </p>
            </div>
          </div>

          {/* Limitation 1: 30m Satellite DEM Resolution */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>1. DEM Resolution & Vertical Cut-Slope Smoothing</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Regional 30-meter satellite elevation models (e.g., SRTM, AW3D30) average topography across a 900 m&sup2; horizontal pixel. 
              Along hill highways such as NH-58, engineered road excavation frequently cuts slopes at near-vertical angles (70&deg;&ndash;85&deg;). 
              A 30m grid physically averages these vertical benches with adjacent gentler valleys, under-predicting the true localized slope angle &beta;.
            </p>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              <b className="text-slate-200">System Mitigation:</b> The engine marks 30m SRTM segments with lower confidence penalties and incorporates engineered cut slope parameters ($60&deg;&ndash;82&deg;$) alongside 5m airborne LiDAR whenever available.
            </div>
          </div>

          {/* Limitation 2: Infinite Slope Model Assumptions */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>2. Infinite Slope Model Boundary Assumptions</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              The Infinite Slope model assumes translational planar sliding along a failure plane parallel to the ground surface at depth $z$, 
              where length and width are infinite relative to soil mantle thickness. This model is exceptionally well-suited for shallow rainfall-induced 
              debris flows and colluvial slides ($z &le; 2&ndash;3.5$ m) prevalent throughout the Garhwal Himalayas.
            </p>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
              <b className="text-slate-200">Boundary Note:</b> The model excludes lateral boundary shear resistance and does not calculate deep circular rotational failures (Bishop / Morgenstern-Price methods) in massive intact rock masses without defined planar joints.
            </div>
          </div>

          {/* Limitation 3: Hydrological & Groundwater Simplifications */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>3. Subsurface Pore-Water Dynamics vs. In-Situ Piezometry</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Live pore-water pressure $u(t) = \gamma_w \cdot h_w(t) \cdot \cos^2(\beta)$ is calculated from dynamic rainfall infiltration and hydraulic conductivity ($K_{'{sat}'}$). 
              In reality, complex geological fracture systems, karst limestone cavities, and subsurface water pipes can cause localized pressure surges 
              or delayed subterranean seepage spikes that require vibrating wire piezometers to measure directly.
            </p>
          </div>

          {/* Limitation 4: Confidence Policy */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>4. Absolute Confidence Rule: "Confidence is Not Risk"</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              In strict adherence to Level-1 Geotechnical Protocols, any road segment with missing borehole strength data, 
              interpolated lithology, or rainfall telemetry delayed over 3 hours is <b>NEVER declared SAFE</b>, regardless of its mathematical FoS. 
              It is quarantined as <b className="text-purple-400 font-bold">DATA DEFICIENT</b> to prevent false security among highway operators.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-colors"
          >
            Acknowledge Disclosures
          </button>
        </div>
      </div>
    </div>
  );
};
