-- Enforce the Projects status workflow used by the ERP UI.
-- Safe to rerun: invalid legacy values are normalized to Planning before the constraint is added.

alter table if exists public.projects
  add column if not exists status text;

update public.projects
set status = 'Planning'
where status is null
   or status not in ('Planning', 'In Progress', 'Completed', 'On Hold');

alter table if exists public.projects
  alter column status set default 'Planning',
  alter column status set not null;

do $$
begin
  if to_regclass('public.projects') is not null
     and not exists (
       select 1
       from pg_constraint
       where conrelid = 'public.projects'::regclass
         and conname = 'projects_status_allowed_check'
     ) then
    alter table public.projects
      add constraint projects_status_allowed_check
      check (status in ('Planning', 'In Progress', 'Completed', 'On Hold'));
  end if;
end $$;

create index if not exists projects_status_idx on public.projects (status);
