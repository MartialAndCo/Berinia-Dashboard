-- Supabase Migration: Client Onboarding
-- Run this in Supabase SQL Editor if you want database-level columns in addition to user_metadata

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_data jsonb DEFAULT NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;
