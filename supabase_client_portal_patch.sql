-- Client Portal Database Patch

-- 1. Extend calls table with tags and notes
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS notes text DEFAULT NULL;

-- 2. Extend clients table with notification preferences & privacy settings
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"negative_sentiment": true, "weekly_digest": false, "usage_alerts": true}'::jsonb;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS privacy_mask_phones boolean DEFAULT false;

-- 3. Create client_members table for team management
CREATE TABLE IF NOT EXISTS public.client_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

-- Enable RLS on client_members
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

-- 4. Policies for client_members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can view own team members') THEN
    CREATE POLICY "Clients can view own team members"
    ON public.client_members FOR SELECT
    USING (
      client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 5. Add UPDATE policy for clients (allowing clients to update their own profile)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can update own profile') THEN
    CREATE POLICY "Clients can update own profile"
    ON public.clients FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 6. Add UPDATE policy for calls (allowing clients to update tags and notes on their own calls)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Clients can update own calls metadata') THEN
    CREATE POLICY "Clients can update own calls metadata"
    ON public.calls FOR UPDATE
    USING (
      client_id IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;
