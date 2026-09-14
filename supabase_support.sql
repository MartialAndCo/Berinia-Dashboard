-- Supabase Migration: Direct Support & Ticketing System

create extension if not exists uuid-ossp;

-- 1. Create support_conversations table
create table if not exists public.support_conversations (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete cascade not null,
  company_name text not null default '',
  client_email text not null default '',
  subject text not null default 'Assistance BerinAgents',
  status text not null default 'pending', -- 'pending', 'in_progress', 'resolved'
  last_message_preview text default '',
  last_sender text default 'client',
  unread_admin integer not null default 0,
  unread_client integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Create support_messages table
create table if not exists public.support_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references public.support_conversations(id) on delete cascade not null,
  sender text not null, -- 'client', 'admin'
  sender_name text not null default '',
  content text not null,
  created_at timestamptz default now()
);

-- Indices for rapid queries
create index if not exists idx_support_conversations_client_id on public.support_conversations(client_id);
create index if not exists idx_support_conversations_status on public.support_conversations(status);
create index if not exists idx_support_messages_conversation_id on public.support_messages(conversation_id);

-- Enable RLS
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

-- Client RLS Policies
create policy Clients can view their own support conversations
  on public.support_conversations for select
  using (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy Clients can create their own support conversations
  on public.support_conversations for insert
  with check (
    client_id in (select id from public.clients where user_id = auth.uid())
  );

create policy Clients can view messages of their conversations
  on public.support_messages for select
  using (
    conversation_id in (
      select id from public.support_conversations where client_id in (
        select id from public.clients where user_id = auth.uid()
      )
    )
  );

create policy Clients can send messages to their conversations
  on public.support_messages for insert
  with check (
    conversation_id in (
      select id from public.support_conversations where client_id in (
        select id from public.clients where user_id = auth.uid()
      )
    )
  );
