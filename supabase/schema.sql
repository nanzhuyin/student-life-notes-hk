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

create table if not exists public.otter_posts (
  id text primary key,
  section_id text not null,
  title text not null,
  summary text not null default '',
  content text not null,
  tags jsonb not null default '[]'::jsonb,
  region text not null default '',
  source text not null default '',
  author_role text not null default '管理员',
  status text not null default 'published' check (status in ('published', 'draft', 'deleted', 'archived')),
  shared boolean not null default false,
  recommended boolean not null default false,
  owner_id text not null default '',
  school_id text not null default 'shared',
  image_urls jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists otter_users_email_idx on public.otter_users (email);
create unique index if not exists otter_users_username_lower_unique_idx on public.otter_users (lower(username));
create index if not exists otter_analytics_events_timestamp_idx on public.otter_analytics_events (timestamp desc);
create index if not exists otter_analytics_events_school_idx on public.otter_analytics_events (school_id);
create index if not exists otter_support_tickets_user_idx on public.otter_support_tickets (user_id);
create index if not exists otter_support_tickets_contact_idx on public.otter_support_tickets (contact);
create index if not exists otter_support_tickets_status_idx on public.otter_support_tickets (status);
create index if not exists otter_posts_section_idx on public.otter_posts (section_id);
create index if not exists otter_posts_school_idx on public.otter_posts (school_id);
create index if not exists otter_posts_status_idx on public.otter_posts (status);
create index if not exists otter_posts_updated_idx on public.otter_posts (updated_at desc);

alter table public.otter_users enable row level security;
alter table public.otter_analytics_events enable row level security;
alter table public.otter_support_tickets enable row level security;
alter table public.otter_posts enable row level security;

drop policy if exists "No public client access to otter_users" on public.otter_users;
drop policy if exists "No public client access to otter_analytics_events" on public.otter_analytics_events;
drop policy if exists "No public client access to otter_support_tickets" on public.otter_support_tickets;
drop policy if exists "No public client access to otter_posts" on public.otter_posts;

grant usage on schema public to service_role;
grant all privileges on table public.otter_users to service_role;
grant all privileges on table public.otter_analytics_events to service_role;
grant all privileges on table public.otter_support_tickets to service_role;
grant all privileges on table public.otter_posts to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;

create table if not exists public.programmes (
  id text primary key,
  programme_name text not null,
  degree_level text,
  school text,
  department text,
  official_url text,
  summary text,
  keywords text[] default '{}',
  suitable_backgrounds text[] default '{}',
  learning_objectives text[] default '{}',
  core_courses text[] default '{}',
  course_descriptions jsonb not null default '[]'::jsonb,
  important_courses jsonb not null default '[]'::jsonb,
  skills_developed text[] default '{}',
  career_directions text[] default '{}',
  admission_notes text,
  information_insufficient boolean not null default false,
  information_limits text[] default '{}',
  source_text text,
  source_urls text[] default '{}',
  source_hash text,
  source_updated_at timestamptz,
  last_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.programme_sync_logs (
  id uuid primary key default gen_random_uuid(),
  programme_id text,
  source_url text,
  old_source_hash text,
  new_source_hash text,
  changed_fields text[] default '{}',
  sync_status text,
  error_message text,
  detected_at timestamptz not null default now()
);

create table if not exists public.recommendation_logs (
  id uuid primary key default gen_random_uuid(),
  has_chosen_programme boolean default false,
  selected_programme_id text,
  selected_programme_name text,
  undergraduate_major text,
  master_major text,
  main_courses text[] default '{}',
  skills text[] default '{}',
  interests text[] default '{}',
  career_goals text[] default '{}',
  preferred_directions text[] default '{}',
  target_degree_levels text[] default '{}',
  study_preferences text[] default '{}',
  concerns text[] default '{}',
  work_experience text[] default '{}',
  retrieved_programme_ids text[] default '{}',
  model_output jsonb,
  created_at timestamptz not null default now()
);

alter table public.recommendation_logs add column if not exists has_chosen_programme boolean default false;
alter table public.recommendation_logs add column if not exists selected_programme_id text;
alter table public.recommendation_logs add column if not exists selected_programme_name text;
alter table public.recommendation_logs add column if not exists master_major text;
alter table public.recommendation_logs add column if not exists target_degree_levels text[] default '{}';
alter table public.recommendation_logs add column if not exists study_preferences text[] default '{}';
alter table public.recommendation_logs add column if not exists concerns text[] default '{}';
alter table public.recommendation_logs add column if not exists work_experience text[] default '{}';

create index if not exists programmes_degree_level_idx on public.programmes (degree_level);
create index if not exists programmes_school_idx on public.programmes (school);
create index if not exists programmes_source_hash_idx on public.programmes (source_hash);
create index if not exists programmes_updated_idx on public.programmes (last_updated_at desc);
create index if not exists programme_sync_logs_programme_idx on public.programme_sync_logs (programme_id);
create index if not exists programme_sync_logs_detected_idx on public.programme_sync_logs (detected_at desc);
create index if not exists recommendation_logs_selected_programme_idx on public.recommendation_logs (selected_programme_id);
create index if not exists recommendation_logs_created_idx on public.recommendation_logs (created_at desc);

alter table public.programmes enable row level security;
alter table public.programme_sync_logs enable row level security;
alter table public.recommendation_logs enable row level security;

drop policy if exists "No public client access to programmes" on public.programmes;
drop policy if exists "No public client access to programme_sync_logs" on public.programme_sync_logs;
drop policy if exists "No public client access to recommendation_logs" on public.recommendation_logs;

grant all privileges on table public.programmes to service_role;
grant all privileges on table public.programme_sync_logs to service_role;
grant all privileges on table public.recommendation_logs to service_role;
