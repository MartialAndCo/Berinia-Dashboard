-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Clients (Pods) Table
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  company_name text not null,
  billing_rate_per_min numeric not null default 0.00,
  monthly_retainer numeric not null default 0.00,
  stripe_customer_id text,
  created_at timestamptz default now()
);

-- 2. Create Agents Table
create table public.agents (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade not null,
  retell_agent_id text not null,
  agent_name text not null,
  created_at timestamptz default now()
);

-- 3. Create Calls Table
create table public.calls (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade not null,
  agent_id uuid references public.agents(id) on delete cascade not null,
  retell_call_id text not null,
  duration_secs integer not null,
  cost numeric not null,
  transcript text,
  recording_url text,
  created_at timestamptz default now()
);

-- Turn on Row Level Security (RLS)
alter table public.clients enable row level security;
alter table public.agents enable row level security;
alter table public.calls enable row level security;

-- Policies for Clients (A client can only view their own profile)
create policy "Clients can view own profile" 
on public.clients for select 
using (auth.uid() = user_id);

-- Policies for Agents (A client can only view their own agents)
create policy "Clients can view own agents" 
on public.agents for select 
using (
  client_id in (
    select id from public.clients where user_id = auth.uid()
  )
);

-- Policies for Calls (A client can only view their own calls)
create policy "Clients can view own calls" 
on public.calls for select 
using (
  client_id in (
    select id from public.clients where user_id = auth.uid()
  )
);
