import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  FileCheck, 
  Layers, 
  Compass, 
  Droplets,
  AlertOctagon,
  Scale,
  Navigation,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info
} from 'lucide-react';
import { HighwaySegment, SegmentRiskTelemetry } from '../types';

interface SegmentDetailModalProps {
  isOpen?: boolean;
  segment: HighwaySegment | null;
  telemetry: SegmentRiskTelemetry | null;
  onClose: () => void;
  onLogIncident: (segment: HighwaySegment) => void;
}

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({
  isOpen = true,
  segment,
  telemetry,
  onClose,
  onLogIncident,
}) => {
  const [showFormulas, setShowFormulas] = useState(false);

  // Close on Escape key press
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !segment || !telemetry) return null;

  const isUnstable = telemetry.riskTier === 'UNSTABLE';
  const isMarginal = telemetry.riskTier === 'MARGINAL';
  const isDataDeficient = telemetry.riskTier === 'DATA_DEFICIENT';

  // Plain-English safety advisory
  let safetyTitle = 'SAFE: Normal Road Conditions';
  let safetyAdvice = 'The mountain slope above this highway section is stable. Road is open for normal travel.';
  let safetyColor = 'text-emerald-400';
  let safetyBg = 'bg-emerald-950/40 border-emerald-500/50';

  if (isUnstable) {
    safetyTitle = '🚨 HIGH DANGER: Imminent Landslide / Rockfall Hazard';
    safetyAdvice = 'Heavy rainfall has waterlogged the steep cliff face. The soil cannot hold its weight and is sliding downward. Avoid this stretch or halt at nearest checkpoint.';
    safetyColor = 'text-rose-400';
    safetyBg = 'bg-rose-950/70 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.3)]';
  } else if (isMarginal) {
    safetyTitle = '⚠️ CAUTION: Active Slope Movement Detected';
    safetyAdvice = 'Rainfall has softened the ground. Small rocks and mud may spill onto the road. Drive slowly and do not stop your vehicle under the cliff face.';
    safetyColor = 'text-amber-400';
    safetyBg = 'bg-amber-950/50 border-amber-500/50';
  } else if (isDataDeficient) {
    safetyTitle = '❓ UNVERIFIED DATA: Inspection Advised';
    safetyAdvice = 'Ground sensors need physical calibration. Highway patrol should verify conditions before high-traffic movement.';
    safetyColor = 'text-purple-400';
    safetyBg = 'bg-purple-950/50 border-purple-500/50';
  }

  // Geotechnical calculation breakdown for engineers
  const betaRad = (segment.slopeBeta * Math.PI) / 180;
  const cosBeta = Math.cos(betaRad);
  const sinBeta = Math.sin(betaRad);
  const cos2Beta = cosBeta * cosBeta;

  const totalSoilStress = segment.unitWeightKnM3 * segment.soilDepthM; // gamma_sat * z
  const effectiveStress = Math.max(0, totalSoilStress - telemetry.porePressureKpa) * cos2Beta;

  return (
    <div 
      id="segment-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isUnstable 
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-400' 
                : isMarginal
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                : isDataDeficient
                ? 'bg-purple-950/80 border-purple-500/50 text-purple-400'
                : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
            }`}>
              {isUnstable && <AlertOctagon className="w-5 h-5 animate-pulse" />}
              {isMarginal && <AlertTriangle className="w-5 h-5" />}
              {isDataDeficient && <HelpCircle className="w-5 h-5" />}
              {!isUnstable && !isMarginal && !isDataDeficient && <CheckCircle2 className="w-5 h-5" />}
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                {segment.name}
                <span className="text-xs font-mono font-normal text-cyan-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                  Km {segment.chainageKm} ({segment.code})
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {segment.geology} • NH-58 Himalayan Highway
              </p>
            </div>
          </div>

          <button
            id="close-segment-modal-top-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close Safety Inspector"
            title="Close Safety Inspector"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* User-Friendly Traveler Safety Summary Card */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${safetyBg} space-y-2`}>
            <div className={`text-base font-bold flex items-center gap-2 ${safetyColor}`}>
              <span>{safetyTitle}</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {safetyAdvice}
            </p>
          </div>

          {/* Key Facts at a Glance (Friendly Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Steepness */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-xs flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mountain Slope</span>
              </div>
              <div className="text-lg font-bold text-slate-100 mt-1">
                {segment.slopeBeta}°
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {segment.slopeBeta > 45 ? 'Very Steep Cliff' : 'Moderate Incline'}
              </div>
            </div>

            {/* Current Rain */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-xs flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                <span>Rainfall Intensity</span>
              </div>
              <div className="text-lg font-bold text-cyan-300 mt-1">
                {telemetry.rain1hMm.toFixed(1)} mm/h
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Past 24h: {telemetry.rain24hMm.toFixed(1)} mm
              </div>
            </div>

            {/* Soil Wetness */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-xs flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Ground Wetness</span>
              </div>
              <div className="text-lg font-bold text-amber-300 mt-1">
                {telemetry.waterTableHeightM > 1.5 ? 'Heavy Waterlogged' : 'Partially Moist'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Water table: {telemetry.waterTableHeightM.toFixed(1)} m deep
              </div>
            </div>

            {/* Overall Stability */}
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-xs flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-purple-400" />
                <span>Safety Rating</span>
              </div>
              <div className={`text-lg font-bold mt-1 ${safetyColor}`}>
                {isUnstable ? 'CRITICAL DANGER' : isMarginal ? 'CAUTION' : 'SAFE'}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Safety Factor: {telemetry.fos.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Simple Visual Cross Section (Why does it slide?) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Why Landslides Happen on This Stretch:</span>
              <span className="text-[11px] text-cyan-400">Elevation: {segment.elevationM} m</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              When rain falls on this <b>{segment.slopeBeta}° slope</b>, water sinks into the top {segment.soilDepthM} meters of loose soil and mud. 
              The added water makes the hillside heavier while simultaneously acting like a lubricant, pushing the soil grains apart. 
              {isUnstable 
                ? ' Right now, the downward pull of gravity exceeds the strength of the soil, making a collapse imminent.' 
                : ' Currently, the ground friction remains strong enough to hold the slope in place.'}
            </p>
          </div>

          {/* Optional Expandable Section for Geotechnical Engineers */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className="w-full px-4 py-3 bg-slate-950 hover:bg-slate-900/80 flex items-center justify-between text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-cyan-400">
                <Cpu className="w-4 h-4" />
                <span>Geotechnical Engineering Mechanics & Formulas (Infinite Slope Model)</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                {showFormulas ? 'Collapse Technical View' : 'Expand Formulas & Data'}
                {showFormulas ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showFormulas && (
              <div className="p-4 bg-slate-950/70 border-t border-slate-800 space-y-4 font-mono text-xs">
                {/* Mathematical Equation substitution */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="text-[11px] text-cyan-400 font-bold">
                    INFINITE SLOPE LIMIT EQUILIBRIUM EQUATION:
                  </div>
                  <div className="p-2 rounded bg-slate-950 text-cyan-200 text-center overflow-x-auto text-[11px]">
                    FoS = [ c' + (γ_sat · z - u(t)) · cos²(β) · tan(φ') ] / [ γ_sat · z · sin(β) · cos(β) ]
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <div>Effective Cohesion c': <b className="text-slate-200">{segment.cohesionKpa} kPa</b></div>
                    <div>Friction Angle φ': <b className="text-slate-200">{segment.frictionAngleDeg}°</b></div>
                    <div>Bulk Unit Weight γ_sat: <b className="text-slate-200">{segment.unitWeightKnM3} kN/m³</b></div>
                    <div>Mantle Depth z: <b className="text-slate-200">{segment.soilDepthM} m</b></div>
                    <div>Pore Pressure u(t): <b className="text-cyan-300">{telemetry.porePressureKpa.toFixed(1)} kPa</b></div>
                    <div>Calculated FoS: <b className="text-rose-400">{telemetry.fos.toFixed(2)}</b></div>
                  </div>
                </div>

                {/* Stresses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Resisting Shear Strength (τ_resist):</span>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {telemetry.resistingShearStrengthKpa.toFixed(1)} kPa
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Driving Downslope Stress (τ_drive):</span>
                    <div className="text-sm font-bold text-rose-400 mt-0.5">
                      {telemetry.drivingShearStressKpa.toFixed(1)} kPa
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => onLogIncident(segment)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <FileCheck className="w-4 h-4 text-cyan-400" />
            <span>Submit Ground Field Verification Report</span>
          </button>

          <button
            id="close-segment-modal-bottom-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          >
            Close Safety Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
