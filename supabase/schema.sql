create table if not exists public.otter_users (
  id text primary key,
  email text not null unique,
  username text not null,
  school_id text not null check (school_id in ('eduhk', 'lingnan')),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.otter_analytics_events (
  id text primary key,
  timestamp timestamptz not null default now(),
  type text not null,
  school_id text,
  route_name text,
  feature text,
  target_id text,
  duration_seconds numeric not null default 0,
  path text,
  session_id text,
  user_agent text,
  ip_hint text,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.otter_support_tickets (
  id text primary key,
  user_id text,
  username text,
  school_id text,
  type text not null,
  contact text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'closed', 'new')),
  admin_note text not null default '',
  admin_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists otter_users_email_idx on public.otter_users (email);
create index if not exists otter_analytics_events_timestamp_idx on public.otter_analytics_events (timestamp desc);
create index if not exists otter_analytics_events_school_idx on public.otter_analytics_events (school_id);
create index if not exists otter_support_tickets_user_idx on public.otter_support_tickets (user_id);
create index if not exists otter_support_tickets_contact_idx on public.otter_support_tickets (contact);
create index if not exists otter_support_tickets_status_idx on public.otter_support_tickets (status);

alter table public.otter_users enable row level security;
alter table public.otter_analytics_events enable row level security;
alter table public.otter_support_tickets enable row level security;

drop policy if exists "No public client access to otter_users" on public.otter_users;
drop policy if exists "No public client access to otter_analytics_events" on public.otter_analytics_events;
drop policy if exists "No public client access to otter_support_tickets" on public.otter_support_tickets;
