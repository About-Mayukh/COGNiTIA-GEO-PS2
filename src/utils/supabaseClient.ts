import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { SosReport, EmergencyBroadcast, UserAuthProfile } from '../types';

// Read from Vite environment or Local Storage (custom config)
const DEFAULT_SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const DEFAULT_SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; key: string; isConfigured: boolean } {
  const customUrl = localStorage.getItem('geospatial_supabase_url');
  const customKey = localStorage.getItem('geospatial_supabase_key');
  
  const url = customUrl || DEFAULT_SUPABASE_URL;
  const key = customKey || DEFAULT_SUPABASE_ANON_KEY;
  
  return {
    url,
    key,
    isConfigured: Boolean(url && key && url.startsWith('http')),
  };
}

export function initSupabase(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
    }
  }
  return supabaseInstance;
}

export function setCustomSupabaseConfig(url: string, key: string) {
  if (url) localStorage.setItem('geospatial_supabase_url', url.trim());
  else localStorage.removeItem('geospatial_supabase_url');

  if (key) localStorage.setItem('geospatial_supabase_key', key.trim());
  else localStorage.removeItem('geospatial_supabase_key');

  supabaseInstance = null;
}

/**
 * Local auth session management (works even when Supabase keys are not yet configured,
 * and syncs automatically with Supabase auth when keys are provided)
 */
const STORAGE_USER_KEY = 'geospatial_active_user';

export function getLocalUser(): UserAuthProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): UserAuthProfile | null {
  return getLocalUser();
}

export function onAuthStateChange(callback: (user: UserAuthProfile | null) => void): () => void {
  const handler = () => {
    callback(getLocalUser());
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function saveLocalUser(user: UserAuthProfile | null) {
  if (user) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_USER_KEY);
  }
}

async function syncProfileToServer(profile: UserAuthProfile): Promise<void> {
  try {
    const response = await fetch('/api/profiles/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: profile.id,
        email: profile.email,
        mobileNumber: profile.mobileNumber,
        name: profile.name,
        role: profile.role,
        createdAt: profile.createdAt,
      }),
    });
    const result = await response.json();
    if (!result.savedToSupabase) {
      console.warn('User profile was not saved to Supabase:', result.error || result.message);
    }
  } catch (error) {
    console.warn('User profile sync request failed:', error);
  }
}

/**
 * Sign up user with Email, Password and REQUIRED Mobile Number
 */
export async function registerUser({
  email,
  password,
  mobileNumber,
  name,
  role = 'user',
}: {
  email: string;
  password: string;
  mobileNumber: string;
  name?: string;
  role?: 'user' | 'admin';
}): Promise<{ success: boolean; user?: UserAuthProfile; error?: string }> {
  if (!email || !password || !mobileNumber) {
    return { success: false, error: 'Email, password, and mobile number are all required.' };
  }

  // Clean phone number
  const cleanPhone = mobileNumber.trim();
  if (cleanPhone.length < 10) {
    return { success: false, error: 'Please enter a valid mobile number (at least 10 digits).' };
  }

  const client = initSupabase();

  if (client) {
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            mobile_number: cleanPhone,
            full_name: name || email.split('@')[0],
            role,
          },
        },
      });

      if (error) {
        // Fallback: If signup returned an error, log it
        console.warn('Supabase Auth error:', error.message);
      } else if (data.user) {
        await client.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email || email,
          mobile_number: cleanPhone,
          full_name: name || email.split('@')[0],
          role: 'user',
        }, { onConflict: 'id' });

        const profile: UserAuthProfile = {
          id: data.user.id,
          email: data.user.email || email,
          mobileNumber: cleanPhone,
          name: name || (data.user.user_metadata?.full_name as string) || email.split('@')[0],
          role: 'user',
          createdAt: new Date().toISOString(),
        };
        saveLocalUser(profile);
        await syncProfileToServer(profile);
        return { success: true, user: profile };
      }
    } catch (err: any) {
      console.warn('Supabase auth network error, fallback to local user profile:', err);
    }
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, mobileNumber: cleanPhone, name, role: 'user' }),
    });
    const result = await response.json();
    if (response.ok && result.success && result.user) {
      saveLocalUser(result.user);
      return { success: true, user: result.user };
    }
  } catch (err) {
    console.warn('Server registration unavailable, using local fallback:', err);
  }

  // Standalone fallback: Create persistent local user profile
  const profile: UserAuthProfile = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    email: email.trim().toLowerCase(),
    mobileNumber: cleanPhone,
    name: name?.trim() || email.split('@')[0],
    role: email.toLowerCase().includes('admin') ? 'admin' : role,
    createdAt: new Date().toISOString(),
  };

  saveLocalUser(profile);
  return { success: true, user: profile };
}

/**
 * Sign in user with Email & Password
 */
export async function loginUser({
  email,
  password,
  mobileNumber,
  expectedRole,
}: {
  email: string;
  password: string;
  mobileNumber?: string;
  expectedRole?: 'user' | 'admin';
}): Promise<{ success: boolean; user?: UserAuthProfile; error?: string }> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  const client = initSupabase();

  if (client) {
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data.user) {
        const { data: profileRow } = await client
          .from('profiles')
          .select('mobile_number, full_name, role, created_at')
          .eq('id', data.user.id)
          .maybeSingle();

        const storedRole = profileRow?.role === 'admin' ? 'admin' : 'user';
        if (expectedRole === 'admin' && storedRole !== 'admin') {
          await client.auth.signOut();
          return {
            success: false,
            error: 'This account is not registered as an administrator.',
          };
        }

        const profile: UserAuthProfile = {
          id: data.user.id,
          email: data.user.email || email,
          mobileNumber: profileRow?.mobile_number || (data.user.user_metadata?.mobile_number as string) || mobileNumber || '',
          name: profileRow?.full_name || (data.user.user_metadata?.full_name as string) || email.split('@')[0],
          role: storedRole,
          createdAt: profileRow?.created_at || data.user.created_at || new Date().toISOString(),
        };
        saveLocalUser(profile);
        await syncProfileToServer(profile);
        return { success: true, user: profile };
      }
    } catch (err: any) {
      console.warn('Supabase signin error, using local fallback:', err);
    }
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, mobileNumber, expectedRole }),
    });
    const result = await response.json();
    if (response.ok && result.success && result.user) {
      saveLocalUser(result.user);
      return { success: true, user: result.user };
    }
    if (response.status === 403) return { success: false, error: result.error };
  } catch (err) {
    console.warn('Server login unavailable, using local fallback:', err);
  }

  // Fallback for demonstration / local testing
  const existing = getLocalUser();
  if (existing && existing.email.toLowerCase() === email.trim().toLowerCase()) {
    if (expectedRole === 'admin' && existing.role !== 'admin') {
      return {
        success: false,
        error: 'This account is not registered as an administrator.',
      };
    }
    if (mobileNumber) existing.mobileNumber = mobileNumber;
    saveLocalUser(existing);
    return { success: true, user: existing };
  }

  const fallbackProfile: UserAuthProfile = {
    id: `usr_${Date.now()}`,
    email: email.trim().toLowerCase(),
    mobileNumber: mobileNumber || '+91 9876543210',
    name: email.split('@')[0],
    role: expectedRole || 'user',
    createdAt: new Date().toISOString(),
  };

  saveLocalUser(fallbackProfile);
  return { success: true, user: fallbackProfile };
}

export async function logoutUser(): Promise<void> {
  const client = initSupabase();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
  }
  saveLocalUser(null);
}

/**
 * Haversine Formula for distance between two points in km
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Check Supabase Live Connection Status on Server & Client
 */
export async function checkSupabaseStatus(): Promise<{
  isConfigured: boolean;
  connected: boolean;
  url: string | null;
  latencyMs?: number;
  tables?: { sos_reports: boolean; emergency_broadcasts: boolean; profiles: boolean };
  counts?: { sosReports: number; broadcasts: number };
  error?: string | null;
}> {
  try {
    const res = await fetch('/api/supabase/status');
    const data = await res.json();
    return data;
  } catch (err: any) {
    const client = initSupabase();
    return {
      isConfigured: Boolean(client),
      connected: false,
      url: null,
      error: err?.message || 'Server check failed',
    };
  }
}

/**
 * Configure Supabase credentials on both frontend and backend synchronously
 */
export async function configureSupabaseBothSides(url: string, key: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  setCustomSupabaseConfig(url, key);
  try {
    const res = await fetch('/api/supabase/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, key }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to configure server Supabase' };
  }
}

/**
 * Sync initial baseline sample reports & broadcasts to Supabase
 */
export async function syncBaselineData(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/supabase/sync-baseline', { method: 'POST' });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sync failed' };
  }
}

/**
 * Fetch PostgreSQL Schema DDL for copy-paste into Supabase SQL Editor
 */
export async function fetchSchemaSql(): Promise<string> {
  try {
    const res = await fetch('/api/supabase/schema');
    const data = await res.json();
    return data.sql || '';
  } catch {
    return '';
  }
}

/**
 * Subscribe to Realtime SOS Reports if Supabase client is active
 */
export function subscribeToRealtimeSos(
  onNewReport: (report: SosReport) => void,
  onUpdateReport?: (report: SosReport) => void
): (() => void) | null {
  const client = initSupabase();
  if (!client) return null;

  try {
    const channel = client
      .channel('realtime_sos_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_reports' },
        (payload) => {
          const row = payload.new as any;
          if (row) {
            onNewReport({
              id: row.id,
              userId: row.user_id,
              userEmail: row.user_email,
              userMobile: row.user_mobile,
              userName: row.user_name,
              disasterType: row.disaster_type,
              sosSms: row.sos_sms,
              latitude: row.latitude,
              longitude: row.longitude,
              altitudeM: row.altitude_m,
              accuracyMeters: row.accuracy_meters,
              nearestChainageKm: row.nearest_chainage_km,
              nearestLandmark: row.nearest_landmark,
              photoDataUrl: row.photo_data_url || '',
              status: row.status,
              createdAt: row.created_at,
              adminNotes: row.admin_notes,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sos_reports' },
        (payload) => {
          const row = payload.new as any;
          if (row && onUpdateReport) {
            onUpdateReport({
              id: row.id,
              userId: row.user_id,
              userEmail: row.user_email,
              userMobile: row.user_mobile,
              userName: row.user_name,
              disasterType: row.disaster_type,
              sosSms: row.sos_sms,
              latitude: row.latitude,
              longitude: row.longitude,
              altitudeM: row.altitude_m,
              accuracyMeters: row.accuracy_meters,
              nearestChainageKm: row.nearest_chainage_km,
              nearestLandmark: row.nearest_landmark,
              photoDataUrl: row.photo_data_url || '',
              status: row.status,
              createdAt: row.created_at,
              adminNotes: row.admin_notes,
            });
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime SOS subscription error:', err);
    return null;
  }
}

/**
 * Subscribe to Realtime Emergency Broadcasts if Supabase client is active
 */
export function subscribeToRealtimeBroadcasts(
  onBroadcast: (broadcast: EmergencyBroadcast) => void
): (() => void) | null {
  const client = initSupabase();
  if (!client) return null;

  try {
    const channel = client
      .channel('realtime_broadcasts_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emergency_broadcasts' },
        (payload) => {
          const row = payload.new as any;
          if (row && row.active) {
            onBroadcast({
              id: row.id,
              title: row.title,
              message: row.message,
              disasterType: row.disaster_type,
              severity: row.severity,
              centerLat: row.center_lat,
              centerLng: row.center_lng,
              centerName: row.center_name,
              radiusKm: row.radius_km,
              createdAt: row.created_at,
              active: row.active,
              dispatchedBy: row.dispatched_by,
            });
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime Broadcast subscription error:', err);
    return null;
  }
}

/**
 * Fetch ALL Data from Supabase (sos_reports, emergency_broadcasts, profiles)
 */
export async function fetchAllSupabaseData(): Promise<{
  success: boolean;
  fetchedFromSupabase: boolean;
  message?: string;
  counts: { sosReports: number; broadcasts: number; profiles: number };
  data: {
    sosReports: SosReport[];
    broadcasts: EmergencyBroadcast[];
    profiles: any[];
  };
  errors?: string[] | null;
  timestamp?: string;
}> {
  try {
    const res = await fetch('/api/supabase/fetch-all');
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      fetchedFromSupabase: false,
      message: err?.message || 'Network request failed',
      counts: { sosReports: 0, broadcasts: 0, profiles: 0 },
      data: { sosReports: [], broadcasts: [], profiles: [] },
      errors: [err?.message || 'Failed to connect'],
    };
  }
}

/**
 * Bi-directional Sync with Supabase (push local and pull all authoritative from cloud)
 */
export async function syncAllBidirectional(): Promise<{
  success: boolean;
  message?: string;
  pushed?: { sosReports: number; broadcasts: number };
  currentTotalInSupabase?: { sosReports: number; broadcasts: number; profiles: number };
  error?: string;
}> {
  try {
    const res = await fetch('/api/supabase/sync-all', { method: 'POST' });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Sync failed' };
  }
}


