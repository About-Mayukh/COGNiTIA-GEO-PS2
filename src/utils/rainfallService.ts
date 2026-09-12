export interface RainfallScenario {
  id: string;
  name: string;
  description: string;
  rain1hMm: number;
  rain24hMm: number;
}

export const PRESET_SCENARIOS: RainfallScenario[] = [
  {
    id: 'monsoon_surge',
    name: 'Active Monsoon Pulse',
    description: 'Persistent torrential Himalayan monsoon band with elevated groundwater saturation',
    rain1hMm: 38.5,
    rain24hMm: 118.0,
  },
  {
    id: 'cloudburst_catastrophe',
    name: 'Himalayan Cloudburst Event (>75 mm/hr)',
    description: 'Sudden convective localized downpour inducing rapid pore pressure spike and debris liquefaction',
    rain1hMm: 82.0,
    rain24hMm: 245.0,
  },
  {
    id: 'kedarnath_2013_reference',
    name: 'Kedarnath 2013 Historical Benchmark',
    description: 'Multi-day extreme antecedent rainfall exceeding all historical safety factors',
    rain1hMm: 110.0,
    rain24hMm: 340.0,
  },
  {
    id: 'intermittent_drizzle',
    name: 'Intermittent Light Drizzle',
    description: 'Moderate seasonal rain; well-drained slopes maintain equilibrium',
    rain1hMm: 6.5,
    rain24hMm: 32.0,
  },
  {
    id: 'dry_baseline',
    name: 'Dry Pre-Monsoon Baseline',
    description: 'Near-zero pore-water pressure, dry friction angle dominant',
    rain1hMm: 0.0,
    rain24hMm: 1.5,
  },
];

/**
 * Attempts to fetch live real rainfall for Uttarakhand coordinates from OpenWeatherMap live backend proxy.
 * Falls back safely to realistic seasonal telemetry if network is constrained.
 */
export async function fetchLiveRainfallData(lat = 30.2429, lng = 78.8944): Promise<{
  rain1hMm: number;
  rain24hMm: number;
  isRealApi: boolean;
  temperatureC?: number;
  provider: string;
  weatherDescription?: string;
}> {
  try {
    const res = await fetch(`/api/live-rainfall?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          rain1hMm: Math.max(0, Math.round(Number(data.rain1hMm || 0) * 10) / 10),
          rain24hMm: Math.max(0, Math.round(Number(data.rain24hMm || 0) * 10) / 10),
          isRealApi: true,
          temperatureC: data.tempC,
          provider: data.provider || 'OpenWeatherMap Live Radar',
          weatherDescription: data.description,
        };
      }
    }
  } catch (e) {
    console.warn('Backend live rainfall proxy failed, trying direct fallback:', e);
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=precipitation,rain,temperature_2m&hourly=precipitation&forecast_days=2`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`HTTP status ${res.status}`);
    }
    const data = await res.json();
    const currentRain = data.current?.rain ?? data.current?.precipitation ?? 0;
    const hourlyRain: number[] = data.hourly?.precipitation ?? [];
    const recent24h = hourlyRain.slice(0, 24).reduce((sum: number, val: number) => sum + (val || 0), 0);

    return {
      rain1hMm: Math.max(0, Math.round(currentRain * 10) / 10),
      rain24hMm: Math.max(0, Math.round(recent24h * 10) / 10),
      isRealApi: true,
      temperatureC: data.current?.temperature_2m,
      provider: 'Open-Meteo Live Hydro-Met API',
    };
  } catch (err) {
    console.warn('Rainfall APIs failed or timed out, using dynamic Garhwal telemetry simulation:', err);
    return {
      rain1hMm: 24.5,
      rain24hMm: 78.2,
      isRealApi: false,
      temperatureC: 22.4,
      provider: 'Garhwal Hydro-Met Simulation Gateway',
    };
  }
}

