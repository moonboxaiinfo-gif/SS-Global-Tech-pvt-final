-- Run in the Supabase SQL editor after enabling Auth.
-- This migration is additive and keeps built-in roles compatible with custom role names.

create table if not exists public.roles (
  id text primary key,
  name text not null unique,
  permissions jsonb not null default '{}'::jsonb,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'Employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The original inline role check only allowed built-in roles; custom role names need to be valid too.
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
alter table public.user_profiles alter column role set default 'Employee';

create table if not exists public.user_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  module text not null,
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, module)
);

alter table public.user_permissions add column if not exists role text;
alter table public.user_permissions add column if not exists can_create boolean not null default false;

alter table public.roles enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_permissions enable row level security;

-- Owner policies are intentionally explicit. Replace these only if your project uses a different owner profile source.
create policy "owners manage roles" on public.roles for all using (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
) with check (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
);

create policy "authenticated read roles" on public.roles for select using (auth.uid() is not null);

create policy "owners manage profiles" on public.user_profiles for all using (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
) with check (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
);

create policy "users read own profile" on public.user_profiles for select using (id = auth.uid());

create policy "owners manage permissions" on public.user_permissions for all using (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
) with check (
  exists (select 1 from public.user_profiles owner_profile where owner_profile.id = auth.uid() and owner_profile.role = 'Owner' and owner_profile.active)
);

create policy "users read own permissions" on public.user_permissions for select using (user_id = auth.uid());
