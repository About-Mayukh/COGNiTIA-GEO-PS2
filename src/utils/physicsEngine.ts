import { HighwaySegment, SegmentRiskTelemetry, RiskCutoffs, RiskTier } from '../types';

export const GAMMA_W = 9.81; // kN/m³ (Unit weight of water)

/**
 * Calculates physics-grounded slope stability metrics using the Infinite Slope Model
 * and hydrological pore-water pressure coupling from live rainfall.
 */
export function calculateSegmentTelemetry(
  segment: HighwaySegment,
  rain1hMm: number,
  rain24hMm: number,
  cutoffs: RiskCutoffs
): SegmentRiskTelemetry {
  const betaRad = (segment.slopeBeta * Math.PI) / 180;
  const phiRad = (segment.frictionAngleDeg * Math.PI) / 180;
  const z = Math.max(0.5, segment.soilDepthM);
  const gammaSat = segment.unitWeightKnM3;
  const cPrime = segment.cohesionKpa;

  // Hydrological infiltration & transient perched water table height calculation
  // Accounting for soil depth z, saturated hydraulic conductivity K_sat, and antecedent rainfall
  const drainageFactor = Math.max(1.0, 1.0 + (segment.hydraulicConductivityMmHr * 0.04));
  // Cumulative infiltration head approximation (in meters)
  const infiltratedWaterHead = (rain1hMm * 0.025 + rain24hMm * 0.010) / drainageFactor;
  // Perched water table height h_w(t) is bounded between 0 and soil mantle depth z
  const waterTableHeightM = Math.min(z, Math.max(0, infiltratedWaterHead));

  // Pore-water pressure equation:
  // u(t) = max(0, gamma_w * h_w(t) * cos^2(beta))
  const cosBeta = Math.cos(betaRad);
  const sinBeta = Math.sin(betaRad);
  const cos2Beta = cosBeta * cosBeta;

  const porePressureKpa = Math.max(0, GAMMA_W * waterTableHeightM * cos2Beta);

  // Stresses:
  // Driving shear stress: tau_drive = gamma_sat * z * sin(beta) * cos(beta)
  const drivingShearStressKpa = gammaSat * z * sinBeta * cosBeta;

  // Effective normal stress: sigma'_n = (gamma_sat * z - u(t)) * cos^2(beta)
  // (soil in tension-less state bounded at 0)
  const totalSoilColumnStress = gammaSat * z;
  const effectiveVerticalStress = Math.max(0, totalSoilColumnStress - porePressureKpa);
  const effectiveNormalStressKpa = effectiveVerticalStress * cos2Beta;

  // Resisting shear strength (Mohr-Coulomb failure criterion):
  // tau_resist = c' + sigma'_n * tan(phi')
  const tanPhi = Math.tan(phiRad);
  const resistingShearStrengthKpa = cPrime + effectiveNormalStressKpa * tanPhi;

  // Factor of Safety (FoS):
  // FoS = tau_resist / tau_drive
  let fos = 9.99;
  if (drivingShearStressKpa > 0.01) {
    fos = resistingShearStrengthKpa / drivingShearStressKpa;
  }
  // Clamp FoS for display realism
  fos = Math.min(6.0, Math.max(0.05, Math.round(fos * 100) / 100));

  // Baseline Dry FoS (u = 0)
  const dryEffectiveNormalStress = totalSoilColumnStress * cos2Beta;
  const dryResistingShear = cPrime + dryEffectiveNormalStress * tanPhi;
  let dryFos = drivingShearStressKpa > 0.01 ? dryResistingShear / drivingShearStressKpa : 9.99;
  dryFos = Math.min(6.0, Math.max(0.05, Math.round(dryFos * 100) / 100));

  const deltaFosRainfall = Math.max(0, Math.round((dryFos - fos) * 100) / 100);

  // Confidence & Data Transparency calculation
  const confidenceFlags: string[] = [];
  let confidenceScore = 0.0;

  // 1. DEM resolution component
  if (segment.demResolution === '5m Airborne LiDAR') {
    confidenceScore += 0.35;
  } else if (segment.demResolution === '12m TanDEM-X') {
    confidenceScore += 0.25;
  } else {
    confidenceScore += 0.12;
    confidenceFlags.push('30m DEM smooths vertical road cuts');
  }

  // 2. Geotechnical source component
  if (segment.parameterSource === 'Lab Direct Shear (IS 2720)') {
    confidenceScore += 0.35;
  } else if (segment.parameterSource === 'Regional Empirical Correlation (GSI)') {
    confidenceScore += 0.22;
    confidenceFlags.push('Regional lithology correlation (untested)');
  } else {
    confidenceScore += 0.05;
    confidenceFlags.push('Missing geotechnical laboratory boreholes');
  }

  // 3. Telemetry freshness component
  const isStaleTelemetry = segment.telemetryLatencyHours >= 3.0;
  if (segment.telemetryLatencyHours < 1.0) {
    confidenceScore += 0.30;
  } else if (segment.telemetryLatencyHours < 3.0) {
    confidenceScore += 0.18;
    confidenceFlags.push(`Telemetry latency: ${segment.telemetryLatencyHours.toFixed(1)}h`);
  } else {
    confidenceScore += 0.00;
    confidenceFlags.push(`CRITICAL: Stale rain telemetry (${segment.telemetryLatencyHours.toFixed(1)}h old)`);
  }

  confidenceScore = Math.min(1.0, Math.max(0.0, Math.round(confidenceScore * 100) / 100));

  // Risk Classification Tiers:
  // - If Confidence < minConfidenceThreshold (e.g. 0.60): NEVER ASSUME SAFE -> DATA_DEFICIENT
  // - If FoS < unstableThreshold: UNSTABLE (Neon Crimson)
  // - If unstableThreshold <= FoS <= marginalThreshold: MARGINAL (Solar Amber)
  // - If FoS > marginalThreshold: STABLE (Cyber Emerald)
  let riskTier: RiskTier;
  if (confidenceScore < cutoffs.minConfidenceThreshold) {
    riskTier = 'DATA_DEFICIENT';
  } else if (fos < cutoffs.unstableThreshold) {
    riskTier = 'UNSTABLE';
  } else if (fos <= cutoffs.marginalThreshold) {
    riskTier = 'MARGINAL';
  } else {
    riskTier = 'STABLE';
  }

  return {
    segmentId: segment.id,
    timestamp: new Date().toISOString(),
    rain1hMm,
    rain24hMm,
    waterTableHeightM: Math.round(waterTableHeightM * 100) / 100,
    porePressureKpa: Math.round(porePressureKpa * 10) / 10,
    effectiveNormalStressKpa: Math.round(effectiveNormalStressKpa * 10) / 10,
    drivingShearStressKpa: Math.round(drivingShearStressKpa * 10) / 10,
    resistingShearStrengthKpa: Math.round(resistingShearStrengthKpa * 10) / 10,
    fos,
    dryFos,
    deltaFosRainfall,
    riskTier,
    confidenceScore,
    confidenceFlags,
    isStaleTelemetry,
  };
}
