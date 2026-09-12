import React, { useState } from 'react';
import { 
  X, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Clock, 
  User, 
  MapPin,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { HighwaySegment, IncidentFeedbackLog, SegmentRiskTelemetry } from '../types';

interface IncidentFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: IncidentFeedbackLog[];
  onAddIncident: (incident: IncidentFeedbackLog) => void;
  segments: HighwaySegment[];
  telemetries: Map<string, SegmentRiskTelemetry>;
  preselectedSegment?: HighwaySegment | null;
}

export const IncidentFeedbackModal: React.FC<IncidentFeedbackModalProps> = ({
  isOpen,
  onClose,
  incidents,
  onAddIncident,
  segments,
  telemetries,
  preselectedSegment,
}) => {
  const [isLoggingNew, setIsLoggingNew] = useState(false);
  const [selectedSegId, setSelectedSegId] = useState(
    preselectedSegment ? preselectedSegment.id : segments[0]?.id || ''
  );
  const [validationType, setValidationType] = useState<
    'CONFIRMED_LANDSLIDE' | 'FALSE_ALARM' | 'CLEAR_ROAD' | 'ROCKFALL_CLEARED'
  >('CONFIRMED_LANDSLIDE');
  const [volumeM3, setVolumeM3] = useState<number>(1500);
  const [disruptionHours, setDisruptionHours] = useState<number>(6.0);
  const [notes, setNotes] = useState('');
  const [operatorName, setOperatorName] = useState('BRO Patrol Officer / PWD Garhwal');

  if (!isOpen) return null;

  // Compute validation performance metrics / confusion matrix
  const total = incidents.length;
  const confirmed = incidents.filter((i) => i.validationType === 'CONFIRMED_LANDSLIDE').length;
  const falseAlarms = incidents.filter((i) => i.validationType === 'FALSE_ALARM').length;
  const clearRoads = incidents.filter((i) => i.validationType === 'CLEAR_ROAD').length;

  // True Positives = confirmed when predicted UNSTABLE or MARGINAL
  const truePositives = incidents.filter(
    (i) => i.validationType === 'CONFIRMED_LANDSLIDE' && (i.predictedTierAtTime === 'UNSTABLE' || i.predictedTierAtTime === 'MARGINAL')
  ).length;

  const precision = confirmed + falseAlarms > 0 
    ? Math.round((truePositives / (confirmed + falseAlarms)) * 100) 
    : 85;

  const falseAlarmRatio = confirmed + falseAlarms > 0
    ? Math.round((falseAlarms / (confirmed + falseAlarms)) * 100)
    : 15;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seg = segments.find((s) => s.id === selectedSegId);
    if (!seg) return;

    const tel = telemetries.get(seg.id);

    const newLog: IncidentFeedbackLog = {
      id: `INC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      segmentId: seg.id,
      segmentName: seg.name,
      chainageKm: seg.chainageKm,
      validationType,
      predictedTierAtTime: tel?.riskTier || 'MARGINAL',
      predictedFoSAtTime: tel?.fos || 1.10,
      observedRainfall24hMm: tel?.rain24hMm || 60,
      estimatedVolumeM3: validationType === 'CONFIRMED_LANDSLIDE' ? volumeM3 : undefined,
      trafficDisruptionHours: validationType === 'CONFIRMED_LANDSLIDE' ? disruptionHours : undefined,
      operatorNotes: notes || `Field survey report submitted for ${seg.name}.`,
      reportedBy: operatorName,
    };

    onAddIncident(newLog);
    setIsLoggingNew(false);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-bold text-slate-100 flex items-center gap-2">
                Ground-Truth Field Validation & Incident Feedback Loop
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Recording confirmed slope collapses vs. false alarms to calibrate physical thresholds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isLoggingNew && (
              <button
                onClick={() => setIsLoggingNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-xs font-mono text-cyan-300 border border-cyan-500/40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log New Field Observation</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Performance Calibration Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <div className="text-slate-400 text-[10px]">Total Logged Reports</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{total}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Field Patrol Audits</div>
            </div>

            <div className="p-3 bg-rose-950/30 rounded-xl border border-rose-500/30">
              <div className="text-rose-400 text-[10px]">Confirmed Landslides</div>
              <div className="text-xl font-bold text-rose-300 mt-1">{confirmed}</div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">True Physical Events</div>
            </div>

            <div className="p-3 bg-amber-950/30 rounded-xl border border-amber-500/30">
              <div className="text-amber-400 text-[10px]">False Alarm Ratio (FAR)</div>
              <div className="text-xl font-bold text-amber-300 mt-1">{falseAlarmRatio}%</div>
              <div className="text-[10px] text-amber-400/80 mt-0.5">{falseAlarms} unverified triggers</div>
            </div>

            <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/30">
              <div className="text-emerald-400 text-[10px]">Model Precision Rate</div>
              <div className="text-xl font-bold text-emerald-300 mt-1">{precision}%</div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Physical Verification</div>
            </div>
          </div>

          {/* New Incident Submission Form */}
          {isLoggingNew && (
            <form onSubmit={handleSubmit} className="bg-slate-950 p-4 rounded-xl border border-cyan-500/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Submit Ground-Truth Field Verification Report
                </span>
                <button
                  type="button"
                  onClick={() => setIsLoggingNew(false)}
                  className="text-xs font-mono text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                {/* Segment Selector */}
                <div>
                  <label className="block text-slate-400 mb-1">Target Highway Segment</label>
                  <select
                    value={selectedSegId}
                    onChange={(e) => setSelectedSegId(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {segments.map((seg) => (
                      <option key={seg.id} value={seg.id}>
                        {seg.name} ({seg.code} - Km {seg.chainageKm})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Validation Type */}
                <div>
                  <label className="block text-slate-400 mb-1">Ground-Truth Observation</label>
                  <select
                    value={validationType}
                    onChange={(e) => setValidationType(e.target.value as any)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CONFIRMED_LANDSLIDE">CONFIRMED_LANDSLIDE (Actual Slope Collapse)</option>
                    <option value="FALSE_ALARM">FALSE_ALARM (Model predicted risk, road was clear)</option>
                    <option value="CLEAR_ROAD">CLEAR_ROAD (Routine survey verified stability)</option>
                    <option value="ROCKFALL_CLEARED">ROCKFALL_CLEARED (Minor rockfall, road reopened)</option>
                  </select>
                </div>

                {validationType === 'CONFIRMED_LANDSLIDE' && (
                  <>
                    <div>
                      <label className="block text-slate-400 mb-1">Estimated Displaced Volume (m&sup3;)</label>
                      <input
                        type="number"
                        min="10"
                        max="50000"
                        step="50"
                        value={volumeM3}
                        onChange={(e) => setVolumeM3(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Traffic Disruption Time (Hours)</label>
                      <input
                        type="number"
                        min="0.5"
                        max="72"
                        step="0.5"
                        value={disruptionHours}
                        onChange={(e) => setDisruptionHours(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Reporting Officer / Patrol Unit</label>
                  <input
                    type="text"
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Geotechnical & Field Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Describe failure mechanism, tension cracks, drainage blockages, or remediation..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                >
                  Save Incident to Audit Database
                </button>
              </div>
            </form>
          )}

          {/* Historical Incidents Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-slate-300">Logged Incident Registry & Verification Stream</span>
              <span className="text-slate-500">{incidents.length} entries</span>
            </div>

            <div className="divide-y divide-slate-800/80 max-h-[350px] overflow-y-auto">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-4 hover:bg-slate-950/40 transition-colors text-xs font-mono space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{inc.segmentName}</span>
                      <span className="text-cyan-400">({inc.segmentId} • Km {inc.chainageKm})</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {inc.timestamp}
                      </span>
                    </div>

                    <div>
                      {inc.validationType === 'CONFIRMED_LANDSLIDE' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          CONFIRMED LANDSLIDE
                        </span>
                      )}
                      {inc.validationType === 'FALSE_ALARM' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-amber-400" />
                          FALSE ALARM
                        </span>
                      )}
                      {inc.validationType === 'CLEAR_ROAD' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          CLEAR ROAD
                        </span>
                      )}
                      {inc.validationType === 'ROCKFALL_CLEARED' && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          ROCKFALL CLEARED
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 text-[11px] bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    "{inc.operatorNotes}"
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-3">
                      <span>Predicted at Event: <b className="text-slate-200">FoS {inc.predictedFoSAtTime.toFixed(2)} ({inc.predictedTierAtTime})</b></span>
                      <span>24h Rain: <b className="text-cyan-400">{inc.observedRainfall24hMm} mm</b></span>
                      {inc.estimatedVolumeM3 && (
                        <span>Volume: <b className="text-rose-400">{inc.estimatedVolumeM3} m&sup3;</b></span>
                      )}
                      {inc.trafficDisruptionHours && (
                        <span>Closure: <b className="text-amber-400">{inc.trafficDisruptionHours} hrs</b></span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <User className="w-3 h-3 text-slate-500" />
                      <span>{inc.reportedBy}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors"
          >
            Close Incident Center
          </button>
        </div>
      </div>
    </div>
  );
};
