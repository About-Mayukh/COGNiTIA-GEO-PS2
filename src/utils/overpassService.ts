/**
 * Overpass API Service
 * Endpoint: https://overpass-api.de/api/interpreter (Public OpenStreetMap API)
 * 
 * Fetches real OSM highway geometry, road attributes, and emergency POIs
 * (hospitals, police, fuel, emergency shelters) along the NH-58 Garhwal corridor.
 */

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  geometry?: Array<{ lat: number; lon: number }>;
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}

export interface OverpassMapFeature {
  id: string;
  type: 'highway' | 'hospital' | 'police' | 'fuel' | 'cliff';
  name: string;
  coordinates: [number, number][]; // Leaflet [lat, lng]
  center: [number, number];
  tags: Record<string, string>;
  details: string;
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

/**
 * Fetch real OSM road alignment and emergency infrastructure along NH-58
 */
export async function fetchOverpassRoadData(
  bbox: { south: number; west: number; north: number; east: number } = {
    south: 30.08,
    west: 78.25,
    north: 30.58,
    east: 79.55,
  }
): Promise<{ features: OverpassMapFeature[]; timestamp: string; count: number }> {
  // Query OSM for trunk/primary roads (NH-58 / NH-7) and safety infrastructure
  const query = `
    [out:json][timeout:15];
    (
      way["highway"~"trunk|primary"]["ref"~"58|NH|7"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["amenity"~"hospital|police|fuel"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["emergency"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );
    out geom 35;
  `.trim();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Overpass API HTTP ${response.status}: ${response.statusText}`);
    }

    const data: OverpassResponse = await response.json();
    const features: OverpassMapFeature[] = [];

    (data.elements || []).forEach((el) => {
      const tags = el.tags || {};

      if (el.type === 'way' && el.geometry && el.geometry.length > 1) {
        const coords: [number, number][] = el.geometry.map((pt) => [pt.lat, pt.lon]);
        const midIdx = Math.floor(coords.length / 2);
        const refName = tags['ref'] || tags['ref:old'] || 'NH-58';
        const name = tags['name'] || `Highway Segment (${refName})`;

        features.push({
          id: `osm-way-${el.id}`,
          type: 'highway',
          name,
          coordinates: coords,
          center: coords[midIdx],
          tags,
          details: `OSM ${tags['highway'] || 'highway'} • ${tags['surface'] || 'paved'} surface • Speed: ${tags['maxspeed'] || '50'} km/h`,
        });
      } else if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
        let fType: OverpassMapFeature['type'] = 'fuel';
        let name = tags['name'] || 'Safety Point';

        if (tags['amenity'] === 'hospital' || tags['healthcare'] === 'hospital') {
          fType = 'hospital';
          name = tags['name'] || 'Emergency Medical Hospital';
        } else if (tags['amenity'] === 'police') {
          fType = 'police';
          name = tags['name'] || 'Highway Police Checkpoint';
        } else if (tags['amenity'] === 'fuel') {
          fType = 'fuel';
          name = tags['name'] || 'Highway Fuel / Rest Stop';
        }

        features.push({
          id: `osm-node-${el.id}`,
          type: fType,
          name,
          coordinates: [[el.lat, el.lon]],
          center: [el.lat, el.lon],
          tags,
          details: tags['operator'] || tags['opening_hours'] || 'OpenStreetMap public amenity record',
        });
      }
    });

    return {
      features,
      timestamp: data.osm3s?.timestamp_osm_base || new Date().toISOString(),
      count: features.length,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('Overpass API query failed or timed out:', error);
    throw error;
  }
}
