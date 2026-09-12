export interface HighwaySegment {
  id: string;
  code: string;
  name: string;
  highway: string;
  chainageKm: number; // e.g. 45.25 for Ch 45+250
  coordinates: [number, number][]; // [lat, lng] polyline points
  centerCoord: [number, number]; // [lat, lng]
  elevationM: number;
  slopeBeta: number; // Slope angle in degrees (beta)
  aspect: string; // e.g. "SSW", "NW"
  geology: string;
  cohesionKpa: number; // c' effective soil cohesion (kPa)
  frictionAngleDeg: number; // phi' effective angle of internal friction (deg)
  unitWeightKnM3: number; // gamma_sat saturated unit weight (kN/m3)
  soilDepthM: number; // z failure plane depth (m)
  hydraulicConductivityMmHr: number; // K_sat (mm/hr)
  demResolution: '30m SRTM (Satellite)' | '12m TanDEM-X' | '5m Airborne LiDAR';
  parameterSource: 'Lab Direct Shear (IS 2720)' | 'Regional Empirical Correlation (GSI)' | 'Interpolated / Unsampled';
  cutSlopeAngleDeg: number; // engineered vertical cut slope behind highway
  retainingStructure: 'None / Exposed Talus' | 'Crib Wall & Anchors' | 'Gabion Wire Mattresses' | 'Rockfall Netting / Shotcrete';
  historicalSlideCount: number;
  telemetryLatencyHours: number; // for testing freshness & confidence
}

export interface SegmentRiskTelemetry {
  segmentId: string;
  timestamp: string;
  rain1hMm: number;
  rain24hMm: number;
  waterTableHeightM: number; // h_w(t) in meters
  porePressureKpa: number; // u(t) in kPa
  effectiveNormalStressKpa: number; // sigma'_n in kPa
  drivingShearStressKpa: number; // tau_drive in kPa
  resistingShearStrengthKpa: number; // tau_resist in kPa
  fos: number; // Factor of Safety
  dryFos: number; // Baseline dry FoS (u = 0)
  deltaFosRainfall: number; // FoS drop caused by pore pressure
  riskTier: 'UNSTABLE' | 'MARGINAL' | 'STABLE' | 'DATA_DEFICIENT';
  confidenceScore: number; // 0.00 to 1.00
  confidenceFlags: string[];
  isStaleTelemetry: boolean;
}

export type RiskTier = 'UNSTABLE' | 'MARGINAL' | 'STABLE' | 'DATA_DEFICIENT';

export interface RiskCutoffs {
  unstableThreshold: number; // e.g. 1.00
  marginalThreshold: number; // e.g. 1.25
  minConfidenceThreshold: number; // e.g. 0.60
}

export interface IncidentFeedbackLog {
  id: string;
  timestamp: string;
  segmentId: string;
  segmentName: string;
  chainageKm: number;
  validationType: 'CONFIRMED_LANDSLIDE' | 'FALSE_ALARM' | 'CLEAR_ROAD' | 'ROCKFALL_CLEARED';
  predictedTierAtTime: RiskTier;
  predictedFoSAtTime: number;
  observedRainfall24hMm: number;
  estimatedVolumeM3?: number;
  trafficDisruptionHours?: number;
  operatorNotes: string;
  reportedBy: string;
}

export interface WeatherStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  elevationM: number;
  currentRainRateMmHr: number;
  accumulated24hMm: number;
  lastUpdated: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  provider: string;
}

export interface GeotechnicalQueryMessage {
  id: string;
  sender: 'OPERATOR' | 'ENGINE';
  text: string;
  timestamp: string;
  technicalMetrics?: {
    segmentId?: string;
    fos?: number;
    porePressureKpa?: number;
    slopeBeta?: number;
    riskTier?: RiskTier;
    triggerEmergencyModal?: boolean;
  };
}

export interface UserAuthProfile {
  id: string;
  email: string;
  mobileNumber: string;
  name?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export type SosDisasterType = 
  | 'Landslide' 
  | 'Rockfall' 
  | 'Flash Flood' 
  | 'Mudflow' 
  | 'Road Collapse' 
  | 'Vehicle Trapped' 
  | 'Medical Emergency' 
  | 'Other';

export interface SosReport {
  id: string;
  userId: string;
  userEmail: string;
  userMobile: string;
  userName?: string;
  disasterType: SosDisasterType;
  sosSms: string;
  latitude: number;
  longitude: number;
  altitudeM?: number;
  accuracyMeters: number;
  nearestChainageKm?: number;
  nearestLandmark?: string;
  photoDataUrl: string; // Live camera snapshot (strictly prevented from file upload)
  status: 'PENDING' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED';
  createdAt: string;
  adminNotes?: string;
}

export interface EmergencyBroadcast {
  id: string;
  title: string;
  message: string; // The SOS SMS message
  disasterType: string;
  severity: 'CRITICAL' | 'WARNING' | 'ADVISORY';
  centerLat: number;
  centerLng: number;
  centerName: string;
  radiusKm: number; // 10, 20, 30 km geo-fence
  createdAt: string;
  active: boolean;
  dispatchedBy: string;
}
