-- ==============================================================================
-- VSL Analytics & A/B Testing Schema for Supabase
-- ==============================================================================

-- 1. Create table for VSL tracking sessions
CREATE TABLE IF NOT EXISTS public.vsl_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  visitor_id TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'A', -- 'A' or 'B'
  video_src TEXT,
  duration_seconds NUMERIC DEFAULT 0,
  max_seconds_watched NUMERIC DEFAULT 0,
  max_percent_watched NUMERIC DEFAULT 0,
  has_played BOOLEAN DEFAULT false,
  hook_3s BOOLEAN DEFAULT false,
  hook_10s BOOLEAN DEFAULT false,
  hook_30s BOOLEAN DEFAULT false,
  hook_45s BOOLEAN DEFAULT false,
  reached_25 BOOLEAN DEFAULT false,
  reached_50 BOOLEAN DEFAULT false,
  reached_75 BOOLEAN DEFAULT false,
  reached_midpoint BOOLEAN DEFAULT false, -- e.g. 04:30 (270s)
  completed BOOLEAN DEFAULT false,
  cta_clicked BOOLEAN DEFAULT false,
  page_path TEXT DEFAULT '/opt-in',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  user_agent TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for fast aggregation in dashboard
CREATE INDEX IF NOT EXISTS idx_vsl_sessions_variant ON public.vsl_sessions(variant);
CREATE INDEX IF NOT EXISTS idx_vsl_sessions_created_at ON public.vsl_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vsl_sessions_visitor ON public.vsl_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_vsl_sessions_has_played ON public.vsl_sessions(has_played);
CREATE INDEX IF NOT EXISTS idx_vsl_sessions_cta_clicked ON public.vsl_sessions(cta_clicked);

-- 3. Row Level Security
ALTER TABLE public.vsl_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated visitors to insert & update their own sessions
DROP POLICY IF EXISTS "Public can insert vsl sessions" ON public.vsl_sessions;
CREATE POLICY "Public can insert vsl sessions"
  ON public.vsl_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update vsl sessions" ON public.vsl_sessions;
CREATE POLICY "Public can update vsl sessions"
  ON public.vsl_sessions FOR UPDATE
  USING (true);

-- Allow authenticated admins to view all analytics
DROP POLICY IF EXISTS "Admins can view all vsl sessions" ON public.vsl_sessions;
CREATE POLICY "Admins can view all vsl sessions"
  ON public.vsl_sessions FOR SELECT
  USING (true);
