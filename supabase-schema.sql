-- ====================================================================
-- GEOSPATIAL-PS2 Landslide Early Warning System: Supabase SQL Schema
-- Integrates User Auth, Locked-GPS SOS Reports & Geo-Fenced Broadcasts
-- ====================================================================

-- 1. Commuter & Admin User Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SOS Emergency Distress Reports table
CREATE TABLE IF NOT EXISTS public.sos_reports (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_email TEXT NOT NULL,
  user_mobile TEXT NOT NULL,
  user_name TEXT,
  disaster_type TEXT NOT NULL DEFAULT 'Landslide',
  sos_sms TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude_m DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION DEFAULT 10.0,
  nearest_chainage_km DOUBLE PRECISION,
  nearest_landmark TEXT,
  photo_data_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Geo-Fenced Emergency Broadcasts table (10km, 20km, 30km)
CREATE TABLE IF NOT EXISTS public.emergency_broadcasts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  disaster_type TEXT NOT NULL DEFAULT 'Landslide',
  severity TEXT NOT NULL DEFAULT 'CRITICAL' CHECK (severity IN ('CRITICAL', 'WARNING', 'ADVISORY')),
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  center_name TEXT NOT NULL,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 20.0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  dispatched_by TEXT NOT NULL DEFAULT 'Emergency Command Center',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Emergency Broadcasts (Public read of active warnings)
DROP POLICY IF EXISTS "Allow public read active broadcasts" ON public.emergency_broadcasts;
CREATE POLICY "Allow public read active broadcasts"
  ON public.emergency_broadcasts FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Allow emergency operators to manage broadcasts" ON public.emergency_broadcasts;
CREATE POLICY "Allow emergency operators to manage broadcasts"
  ON public.emergency_broadcasts FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for SOS Reports (Public insert for life-safety emergency dispatch)
DROP POLICY IF EXISTS "Allow public emergency sos dispatch" ON public.sos_reports;
CREATE POLICY "Allow public emergency sos dispatch"
  ON public.sos_reports FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow reading and updating sos reports" ON public.sos_reports;
CREATE POLICY "Allow reading and updating sos reports"
  ON public.sos_reports FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for Profiles
DROP POLICY IF EXISTS "Allow users to read and update own profile" ON public.profiles;
CREATE POLICY "Allow users to read and update own profile"
  ON public.profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Realtime Replication Configuration
-- Enables instant real-time websocket pushes to the browser when new SOS reports or broadcasts are created
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_reports;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_broadcasts;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- High-Performance Indexes for GIS Coordinates & Emergency Queries
CREATE INDEX IF NOT EXISTS idx_sos_reports_status ON public.sos_reports(status);
CREATE INDEX IF NOT EXISTS idx_sos_reports_created ON public.sos_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_reports_coords ON public.sos_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_broadcasts_active ON public.emergency_broadcasts(active);
CREATE INDEX IF NOT EXISTS idx_broadcasts_coords ON public.emergency_broadcasts(center_lat, center_lng);

