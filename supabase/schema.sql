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
  graduate_outcome_summary text default '',
  graduate_outcomes jsonb not null default '[]'::jsonb,
  graduate_outcome_information_insufficient boolean not null default false,
  graduate_outcome_information_limits text[] default '{}',
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
  other_context text default '',
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
alter table public.recommendation_logs add column if not exists other_context text default '';

alter table public.programmes add column if not exists graduate_outcome_summary text default '';
alter table public.programmes add column if not exists graduate_outcomes jsonb not null default '[]'::jsonb;
alter table public.programmes add column if not exists graduate_outcome_information_insufficient boolean not null default false;
alter table public.programmes add column if not exists graduate_outcome_information_limits text[] default '{}';

create index if not exists programmes_degree_level_idx on public.programmes (degree_level);
create index if not exists programmes_school_idx on public.programmes (school);
create index if not exists programmes_source_hash_idx on public.programmes (source_hash);
create index if not exists programmes_graduate_outcomes_gin_idx on public.programmes using gin (graduate_outcomes);
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

create table if not exists public.advisor_programmes (
  id text primary key,
  school_id text not null,
  school text,
  faculty text,
  unit_name text,
  unit_label text,
  title text not null,
  title_en text,
  medium text,
  study_modes jsonb not null default '[]'::jsonb,
  course_count integer not null default 0,
  requirements jsonb not null default '{}'::jsonb,
  source_url text,
  checked_at text,
  source_coverage text,
  source_urls jsonb not null default '[]'::jsonb,
  official_summary text,
  official_career_evidence jsonb not null default '[]'::jsonb,
  official_learning_evidence jsonb not null default '[]'::jsonb,
  domains jsonb not null default '[]'::jsonb,
  intensity jsonb not null default '{}'::jsonb,
  advisor_tags jsonb not null default '[]'::jsonb,
  suitable_for jsonb not null default '[]'::jsonb,
  suitable_student_profiles jsonb not null default '[]'::jsonb,
  less_suitable_for jsonb not null default '[]'::jsonb,
  not_recommended_for jsonb not null default '[]'::jsonb,
  career_directions jsonb not null default '[]'::jsonb,
  study_focus jsonb not null default '[]'::jsonb,
  risk_warnings jsonb not null default '[]'::jsonb,
  advisor_summary text,
  retrieval_keywords jsonb not null default '[]'::jsonb,
  confidence text,
  review_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.advisor_programmes add column if not exists source_coverage text;
alter table public.advisor_programmes add column if not exists source_urls jsonb not null default '[]'::jsonb;
alter table public.advisor_programmes add column if not exists official_summary text;
alter table public.advisor_programmes add column if not exists official_career_evidence jsonb not null default '[]'::jsonb;
alter table public.advisor_programmes add column if not exists official_learning_evidence jsonb not null default '[]'::jsonb;
alter table public.advisor_programmes add column if not exists advisor_tags jsonb not null default '[]'::jsonb;
alter table public.advisor_programmes add column if not exists suitable_student_profiles jsonb not null default '[]'::jsonb;
alter table public.advisor_programmes add column if not exists not_recommended_for jsonb not null default '[]'::jsonb;
alter table public.advisor_programmes add column if not exists risk_warnings jsonb not null default '[]'::jsonb;

create table if not exists public.advisor_courses (
  id text primary key,
  base_id text,
  school_id text not null,
  programme_id text not null,
  programme_title text,
  programme_title_en text,
  faculty text,
  unit_name text,
  title text not null,
  title_zh text,
  type_key text,
  type text,
  required boolean not null default false,
  credits numeric,
  medium text,
  source_url text,
  checked_at text,
  official_basis jsonb not null default '[]'::jsonb,
  domains jsonb not null default '[]'::jsonb,
  intensity jsonb not null default '{}'::jsonb,
  suitable_for jsonb not null default '[]'::jsonb,
  less_suitable_for jsonb not null default '[]'::jsonb,
  career_directions jsonb not null default '[]'::jsonb,
  study_focus jsonb not null default '[]'::jsonb,
  learning_gains jsonb not null default '[]'::jsonb,
  risk_warnings jsonb not null default '[]'::jsonb,
  advisor_summary text,
  retrieval_keywords jsonb not null default '[]'::jsonb,
  evidence_summary text,
  confidence text,
  review_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advisor_rules (
  id text primary key,
  priority integer not null default 0,
  rule text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advisor_reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id text not null,
  reviewer text,
  status text not null default 'pending',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists advisor_programmes_school_idx on public.advisor_programmes (school_id);
create index if not exists advisor_programmes_faculty_idx on public.advisor_programmes (faculty);
create index if not exists advisor_programmes_confidence_idx on public.advisor_programmes (confidence);
create index if not exists advisor_programmes_domains_gin_idx on public.advisor_programmes using gin (domains);
create index if not exists advisor_programmes_tags_gin_idx on public.advisor_programmes using gin (advisor_tags);
create index if not exists advisor_courses_school_idx on public.advisor_courses (school_id);
create index if not exists advisor_courses_programme_idx on public.advisor_courses (programme_id);
create index if not exists advisor_courses_base_idx on public.advisor_courses (base_id);
create index if not exists advisor_courses_type_idx on public.advisor_courses (type_key);
create index if not exists advisor_courses_confidence_idx on public.advisor_courses (confidence);
create index if not exists advisor_courses_domains_gin_idx on public.advisor_courses using gin (domains);
create index if not exists advisor_courses_keywords_gin_idx on public.advisor_courses using gin (retrieval_keywords);
create index if not exists advisor_reviews_target_idx on public.advisor_reviews (target_type, target_id);
create index if not exists advisor_reviews_status_idx on public.advisor_reviews (status);

alter table public.advisor_programmes enable row level security;
alter table public.advisor_courses enable row level security;
alter table public.advisor_rules enable row level security;
alter table public.advisor_reviews enable row level security;

drop policy if exists "No public client access to advisor_programmes" on public.advisor_programmes;
drop policy if exists "No public client access to advisor_courses" on public.advisor_courses;
drop policy if exists "No public client access to advisor_rules" on public.advisor_rules;
drop policy if exists "No public client access to advisor_reviews" on public.advisor_reviews;

grant all privileges on table public.advisor_programmes to service_role;
grant all privileges on table public.advisor_courses to service_role;
grant all privileges on table public.advisor_rules to service_role;
grant all privileges on table public.advisor_reviews to service_role;
