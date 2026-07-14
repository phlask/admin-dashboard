-- ============================================================================
-- Resource Editing: holding table, versioned history (+ change log), and the
-- transactional review RPCs behind the admin dashboard.
--
-- Design: phlask/admin-dashboard#3 (see the "Data Model & Review Flow" comment).
-- Also covers #2 (versioning / rollback) and #1 (change log, folded into history).
--
-- NOTE: the resources column list lives in one place — _apply_resource_snapshot()
-- and accept_edit()'s NEW branch. It mirrors the `ResourceEntry` type
-- (app/types/ResourceEntry.ts). Confirm it against the live Supabase `resources`
-- schema before merging; if a column is added to ResourceEntry, add it here too.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type edit_type   as enum ('NEW', 'UPDATE');
create type edit_status as enum ('PENDING', 'ACCEPTED', 'REJECTED');
create type change_type as enum ('CREATE', 'UPDATE', 'ROLLBACK');

-- ---------------------------------------------------------------------------
-- resources: add an authoritative version counter (HEAD).
-- The table already exists (Supabase); adding the column is safe to re-run.
-- ---------------------------------------------------------------------------
alter table public.resources
  add column if not exists version integer not null default 1;

-- ---------------------------------------------------------------------------
-- resource_edits: holding table for pending crowdsourced submissions.
-- ---------------------------------------------------------------------------
create table public.resource_edits (
  id            uuid primary key default gen_random_uuid(),
  resource_id   uuid references public.resources (id) on delete cascade, -- null = NEW
  edit_type     edit_type   not null,
  status        edit_status not null default 'PENDING',

  -- version of the target resource this edit was drafted against; if it is
  -- behind resources.version at review time, the dashboard shows a non-blocking
  -- "changed since submitted" warning. Null for NEW submissions.
  base_version  integer,

  suggested     jsonb not null,      -- full suggested ResourceEntry
  source        jsonb,               -- DataSource

  -- pending-state flags (see open question: flags vs. resources.status)
  unverified    boolean not null default true,
  not_displayed boolean not null default true,
  unreviewed    boolean not null default true,

  submitted_by  text,                -- anon / crowdsource identity
  submitted_at  timestamptz not null default now(),

  reviewed_by   uuid references auth.users (id),
  reviewed_at   timestamptz,
  review_notes  text,

  constraint resource_edits_new_has_no_resource
    check (edit_type <> 'NEW' or resource_id is null),
  constraint resource_edits_update_has_resource
    check (edit_type <> 'UPDATE' or resource_id is not null)
);

create index resource_edits_pending_idx
  on public.resource_edits (status) where status = 'PENDING';
create index resource_edits_resource_idx
  on public.resource_edits (resource_id);

-- ---------------------------------------------------------------------------
-- resource_history: one row per committed version + the change log.
-- HEAD is included, so resources.version always equals the latest history row.
-- ---------------------------------------------------------------------------
create table public.resource_history (
  id                  uuid primary key default gen_random_uuid(),
  resource_id         uuid not null references public.resources (id) on delete cascade,
  version             integer not null,
  snapshot            jsonb not null,          -- ResourceEntry at this version
  change_type         change_type not null,
  changed_by          uuid references auth.users (id),
  changed_at          timestamptz not null default now(),
  produced_by_edit_id uuid references public.resource_edits (id),
  note                text,
  unique (resource_id, version)
);

create index resource_history_resource_idx
  on public.resource_history (resource_id, version desc);

-- ---------------------------------------------------------------------------
-- Dashboard read models (plain views — always fresh; see #3 on why not
-- materialized).
-- ---------------------------------------------------------------------------

-- Brand-new sites awaiting review.
create view public.new_resources_queue as
  select e.*
  from public.resource_edits e
  where e.status = 'PENDING' and e.edit_type = 'NEW'
  order by e.submitted_at;

-- Edits to existing resources, joined to the current resource for the
-- side-by-side compare. `stale` flags base_version drift.
create view public.resource_edits_queue as
  select
    e.*,
    r.version                          as current_version,
    (e.base_version is not null
       and e.base_version < r.version)  as stale,
    to_jsonb(r.*)                      as current_resource
  from public.resource_edits e
  join public.resources r on r.id = e.resource_id
  where e.status = 'PENDING' and e.edit_type = 'UPDATE'
  order by e.submitted_at;

-- Pending-edit count per resource, for list badges.
create view public.resource_edit_counts as
  select resource_id, count(*) as pending_count
  from public.resource_edits
  where status = 'PENDING' and resource_id is not null
  group by resource_id;

-- Readable change log for the per-resource history / approvals page (#7/#8).
create view public.resource_change_log as
  select h.resource_id, h.version, h.change_type,
         h.changed_by, h.changed_at, h.produced_by_edit_id, h.note
  from public.resource_history h
  order by h.resource_id, h.version desc;

-- ---------------------------------------------------------------------------
-- Internal helper: overwrite a resource's data columns from a jsonb payload
-- (the ResourceEntry shape), set the given version, and stamp last_modified.
-- Centralizes the one place the resources column list is enumerated.
-- ---------------------------------------------------------------------------
create or replace function public._apply_resource_snapshot(
  p_id uuid, p_payload jsonb, p_version integer
) returns public.resources
language plpgsql
security definer
set search_path = public
as $$
declare
  cur jsonb;
  s   public.resources;
  r   public.resources;
begin
  select to_jsonb(t) into cur from public.resources t where t.id = p_id;
  if cur is null then
    raise exception 'resource % not found', p_id;
  end if;

  -- Overlay the suggested changes onto the current row so fields the edit does
  -- not mention are preserved, and never let an edit change id / date_created /
  -- creator (server-managed / immutable).
  s := jsonb_populate_record(
         null::public.resources,
         cur || p_payload || jsonb_build_object(
           'id',           cur -> 'id',
           'date_created', cur -> 'date_created',
           'creator',      cur -> 'creator'
         )
       );

  update public.resources t set
    date_created  = s.date_created,
    creator       = s.creator,
    last_modifier = s.last_modifier,
    source        = s.source,
    verification  = s.verification,
    resource_type = s.resource_type,
    address       = s.address,
    city          = s.city,
    state         = s.state,
    zip_code      = s.zip_code,
    latitude      = s.latitude,
    longitude     = s.longitude,
    gp_id         = s.gp_id,
    images        = s.images,
    guidelines    = s.guidelines,
    description   = s.description,
    name          = s.name,
    status        = s.status,
    entry_type    = s.entry_type,
    hours         = s.hours,
    water         = s.water,
    food          = s.food,
    forage        = s.forage,
    bathroom      = s.bathroom,
    version       = p_version,
    last_modified = now()
  where t.id = p_id
  returning * into r;

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs (transactional). SECURITY DEFINER so reviewers can run the privileged
-- writes without direct table grants; callers are gated by the EXECUTE grants
-- and RLS policies below.
-- ---------------------------------------------------------------------------

-- Apply a pending edit; snapshot the resulting version into history.
create or replace function public.accept_edit(p_edit_id uuid, p_reviewer uuid)
returns public.resources
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.resource_edits;
  r public.resources;
  v integer;
begin
  select * into e from public.resource_edits where id = p_edit_id for update;
  if not found then
    raise exception 'edit % not found', p_edit_id;
  end if;
  if e.status <> 'PENDING' then
    raise exception 'edit % is % (expected PENDING)', p_edit_id, e.status;
  end if;

  if e.edit_type = 'NEW' then
    -- Create the resource at version 1 from the suggested payload
    -- (id/created defaults come from the table; version forced to 1).
    insert into public.resources (
      date_created, creator, last_modified, last_modifier, source, verification,
      resource_type, address, city, state, zip_code, latitude, longitude, gp_id,
      images, guidelines, description, name, status, entry_type, hours,
      water, food, forage, bathroom, version
    )
    select
      coalesce(s.date_created, now()), s.creator, now(), s.last_modifier,
      s.source, s.verification, s.resource_type, s.address, s.city, s.state,
      s.zip_code, s.latitude, s.longitude, s.gp_id, s.images, s.guidelines,
      s.description, s.name, s.status, s.entry_type, s.hours,
      s.water, s.food, s.forage, s.bathroom, 1
    from jsonb_populate_record(null::public.resources, e.suggested) s
    returning * into r;

    v := 1;
    insert into public.resource_history
      (resource_id, version, snapshot, change_type, changed_by, produced_by_edit_id)
      values (r.id, v, to_jsonb(r), 'CREATE', p_reviewer, e.id);

  else
    -- UPDATE: overwrite the current resource (last-Save-wins) and bump version.
    select * into r from public.resources where id = e.resource_id for update;
    if not found then
      raise exception 'resource % not found', e.resource_id;
    end if;
    v := r.version + 1;
    r := public._apply_resource_snapshot(e.resource_id, e.suggested, v);

    insert into public.resource_history
      (resource_id, version, snapshot, change_type, changed_by, produced_by_edit_id)
      values (r.id, v, to_jsonb(r), 'UPDATE', p_reviewer, e.id);
  end if;

  update public.resource_edits
    set status = 'ACCEPTED', reviewed_by = p_reviewer, reviewed_at = now()
    where id = e.id;

  return r;
end;
$$;

-- Reject a pending edit. Recorded on the edit row; production untouched.
create or replace function public.reject_edit(
  p_edit_id uuid, p_reviewer uuid, p_notes text default null
) returns public.resource_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.resource_edits;
begin
  select * into e from public.resource_edits where id = p_edit_id for update;
  if not found then
    raise exception 'edit % not found', p_edit_id;
  end if;
  if e.status <> 'PENDING' then
    raise exception 'edit % is % (expected PENDING)', p_edit_id, e.status;
  end if;

  update public.resource_edits
    set status = 'REJECTED', reviewed_by = p_reviewer,
        reviewed_at = now(), review_notes = p_notes
    where id = e.id
    returning * into e;

  return e;
end;
$$;

-- Roll a resource back to an earlier version by committing a new forward
-- version that restores that snapshot.
create or replace function public.rollback_resource(
  p_resource_id uuid, p_version integer, p_actor uuid
) returns public.resources
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.resource_history;
  r      public.resources;
  v      integer;
begin
  select * into target
    from public.resource_history
    where resource_id = p_resource_id and version = p_version;
  if not found then
    raise exception 'version % of resource % not found', p_version, p_resource_id;
  end if;

  select * into r from public.resources where id = p_resource_id for update;
  if not found then
    raise exception 'resource % not found', p_resource_id;
  end if;

  v := r.version + 1;
  r := public._apply_resource_snapshot(p_resource_id, target.snapshot, v);

  insert into public.resource_history
    (resource_id, version, snapshot, change_type, changed_by, note)
    values (r.id, v, to_jsonb(r), 'ROLLBACK', p_actor,
            format('rolled back to v%s', p_version));

  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--   * anonymous crowdsourcing may only INSERT pending edits
--   * authenticated reviewers may read edits/history and run the RPCs
--   * `resources` stays publicly readable (the live map) — unchanged here
-- Depends on Supabase Auth for reviewer identity (#13).
-- ---------------------------------------------------------------------------
alter table public.resource_edits   enable row level security;
alter table public.resource_history enable row level security;

-- Anyone (anon) can submit an edit, but only as a fresh PENDING row.
create policy resource_edits_insert_anon
  on public.resource_edits for insert
  to anon, authenticated
  with check (status = 'PENDING');

-- Authenticated reviewers can read the queues.
create policy resource_edits_select_auth
  on public.resource_edits for select
  to authenticated
  using (true);

-- History is readable by authenticated reviewers; writes happen only through
-- the SECURITY DEFINER RPCs (no direct write policy).
create policy resource_history_select_auth
  on public.resource_history for select
  to authenticated
  using (true);

-- Only authenticated reviewers may execute the review RPCs.
revoke execute on function public.accept_edit(uuid, uuid)                from public, anon;
revoke execute on function public.reject_edit(uuid, uuid, text)          from public, anon;
revoke execute on function public.rollback_resource(uuid, integer, uuid) from public, anon;
grant  execute on function public.accept_edit(uuid, uuid)                to authenticated;
grant  execute on function public.reject_edit(uuid, uuid, text)          to authenticated;
grant  execute on function public.rollback_resource(uuid, integer, uuid) to authenticated;

commit;
