-- ============================================================================
-- Resource editing: a dedicated `resource_edits` holding table (typed mirror of
-- the resources fields), review queues, and transactional review RPCs.
--
-- Grounded in the live schema:
--   * resources.id is a BIGINT (not uuid); resources already has `version`
--     (a ResourceEntry SCHEMA version) and `status` (OPERATIONAL | ...).
--   * A throwaway `resource_revisions` table exists — LEFT UNTOUCHED here.
--
-- Design choices (per #3 discussion):
--   * Typed columns mirroring the ResourceEntry fields (easy side-by-side
--     compare), plus a `mapped_resource` link (null = brand-new site).
--   * A DEDICATED `review_status` column (PENDING/APPROVED/REJECTED) — kept
--     separate from the mirrored operational `status`, so the column is not
--     overloaded the way the temp table's was.
--   * Reviewer identity is text (email) to match current data; can move to
--     auth.uid() once #13 lands.
--
-- The apply-on-approve copy into `resources` uses jsonb_populate_record, which
-- adapts to the real `resources` column types — so it is robust even though the
-- exact types (e.g. images text[] vs jsonb) aren't enumerated here.
--
-- DRAFT: verify against a staging Supabase (real resources types + whether
-- resources.id has a default/identity for the NEW-insert path) before prod.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- resource_edits: holding table for pending crowdsourced edits / new sites.
-- ---------------------------------------------------------------------------
create table public.resource_edits (
  id            bigint generated always as identity primary key,

  -- link to the resource being edited; null = brand-new site submission
  mapped_resource bigint references public.resources (id) on delete cascade,

  -- review lifecycle (kept separate from the mirrored operational `status`)
  review_status text not null default 'PENDING'
    check (review_status in ('PENDING', 'APPROVED', 'REJECTED')),
  submitted_by  text,
  submitted_at  timestamptz not null default now(),
  reviewed_by   text,
  reviewed_at   timestamptz,
  review_notes  text,

  -- ---- mirrored ResourceEntry fields (the suggested values) ----
  version       integer,
  date_created  timestamptz,
  creator       text,
  last_modified timestamptz,
  last_modifier text,
  source        jsonb,
  verification  jsonb,
  resource_type text,
  address       text,
  city          text,
  state         text,
  zip_code      text,
  latitude      double precision,
  longitude     double precision,
  gp_id         text,
  images        jsonb,
  guidelines    text,
  description   text,
  name          text,
  status        text,          -- operational status (OPERATIONAL | ...)
  entry_type    text,
  hours         jsonb,
  water         jsonb,
  food          jsonb,
  forage        jsonb,
  bathroom      jsonb
);

create index resource_edits_pending_idx
  on public.resource_edits (review_status) where review_status = 'PENDING';
create index resource_edits_mapped_idx
  on public.resource_edits (mapped_resource);

-- ---------------------------------------------------------------------------
-- Review queues (plain views — always fresh).
-- ---------------------------------------------------------------------------

-- Pending edits to an existing resource, joined to that resource for compare.
create view public.resource_edits_queue as
  select e.*, to_jsonb(r.*) as current_resource
  from public.resource_edits e
  join public.resources r on r.id = e.mapped_resource
  where e.review_status = 'PENDING' and e.mapped_resource is not null;

-- Pending brand-new site submissions.
create view public.new_resources_queue as
  select e.*
  from public.resource_edits e
  where e.review_status = 'PENDING' and e.mapped_resource is null;

-- Pending-edit count per resource, for list badges.
create view public.resource_edit_counts as
  select mapped_resource as resource_id, count(*) as pending_count
  from public.resource_edits
  where review_status = 'PENDING' and mapped_resource is not null
  group by mapped_resource;

-- Resolved edits per resource = the change log.
create view public.resource_change_log as
  select id as edit_id, mapped_resource as resource_id, review_status,
         submitted_by, reviewed_by, reviewed_at, review_notes
  from public.resource_edits
  where review_status in ('APPROVED', 'REJECTED')
  order by mapped_resource, reviewed_at desc;

-- ---------------------------------------------------------------------------
-- Helper: apply a jsonb payload (mirrored ResourceEntry fields) onto an
-- existing resource. jsonb_populate_record adapts to `resources` real column
-- types. Immutable server fields (id / date_created / creator) are preserved.
-- ---------------------------------------------------------------------------
create or replace function public._apply_edit_payload(p_resource_id bigint, p_payload jsonb)
returns public.resources
language plpgsql
security definer
set search_path = public
as $$
declare
  cur jsonb;
  s   public.resources;
  r   public.resources;
begin
  select to_jsonb(t) into cur from public.resources t where t.id = p_resource_id;
  if cur is null then
    raise exception 'resource % not found', p_resource_id;
  end if;

  s := jsonb_populate_record(
         null::public.resources,
         cur || p_payload || jsonb_build_object(
           'id',           cur -> 'id',
           'date_created', cur -> 'date_created',
           'creator',      cur -> 'creator'
         )
       );

  update public.resources t set
    last_modifier = s.last_modifier, source = s.source, verification = s.verification,
    resource_type = s.resource_type, address = s.address, city = s.city, state = s.state,
    zip_code = s.zip_code, latitude = s.latitude, longitude = s.longitude, gp_id = s.gp_id,
    images = s.images, guidelines = s.guidelines, description = s.description, name = s.name,
    status = s.status, entry_type = s.entry_type, hours = s.hours, water = s.water,
    food = s.food, forage = s.forage, bathroom = s.bathroom, version = s.version,
    last_modified = now()
  where t.id = p_resource_id
  returning * into r;

  return r;
end;
$$;

-- Extract just the mirrored resource fields from an edit row as jsonb.
create or replace function public._edit_payload(e public.resource_edits)
returns jsonb language sql immutable as $$
  select to_jsonb(e)
    - 'id' - 'mapped_resource' - 'review_status' - 'submitted_by'
    - 'submitted_at' - 'reviewed_by' - 'reviewed_at' - 'review_notes';
$$;

-- ---------------------------------------------------------------------------
-- Review RPCs (SECURITY DEFINER). Approve applies the edit to `resources`.
-- ---------------------------------------------------------------------------

create or replace function public.approve_edit(p_edit_id bigint, p_reviewer text)
returns public.resources
language plpgsql
security definer
set search_path = public
as $$
declare
  e   public.resource_edits;
  r   public.resources;
  new_id bigint;
begin
  select * into e from public.resource_edits where id = p_edit_id for update;
  if not found then
    raise exception 'edit % not found', p_edit_id;
  end if;
  if e.review_status <> 'PENDING' then
    raise exception 'edit % is % (expected PENDING)', p_edit_id, e.review_status;
  end if;

  if e.mapped_resource is not null then
    r := public._apply_edit_payload(e.mapped_resource, public._edit_payload(e));
  else
    -- NEW site: insert from the mirrored fields (resources.id from its default).
    insert into public.resources (
      version, date_created, creator, last_modified, last_modifier, source,
      verification, resource_type, address, city, state, zip_code, latitude,
      longitude, gp_id, images, guidelines, description, name, status,
      entry_type, hours, water, food, forage, bathroom
    )
    select
      s.version, coalesce(s.date_created, now()), s.creator, now(), s.last_modifier,
      s.source, s.verification, s.resource_type, s.address, s.city, s.state,
      s.zip_code, s.latitude, s.longitude, s.gp_id, s.images, s.guidelines,
      s.description, s.name, s.status, s.entry_type, s.hours, s.water, s.food,
      s.forage, s.bathroom
    from jsonb_populate_record(null::public.resources, public._edit_payload(e)) s
    returning id into new_id;

    update public.resource_edits set mapped_resource = new_id where id = e.id;
    select * into r from public.resources where id = new_id;
  end if;

  update public.resource_edits
    set review_status = 'APPROVED', reviewed_by = p_reviewer, reviewed_at = now()
    where id = e.id;

  return r;
end;
$$;

create or replace function public.reject_edit(p_edit_id bigint, p_reviewer text, p_notes text default null)
returns public.resource_edits
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.resource_edits;
begin
  update public.resource_edits
    set review_status = 'REJECTED', reviewed_by = p_reviewer,
        reviewed_at = now(), review_notes = p_notes
    where id = p_edit_id and review_status = 'PENDING'
    returning * into e;
  if not found then
    raise exception 'edit % not found or not PENDING', p_edit_id;
  end if;
  return e;
end;
$$;

-- Roll a resource back to the state captured by a prior APPROVED edit.
create or replace function public.rollback_to_edit(p_edit_id bigint, p_actor text)
returns public.resources
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.resource_edits;
  r public.resources;
begin
  select * into e from public.resource_edits where id = p_edit_id;
  if not found then
    raise exception 'edit % not found', p_edit_id;
  end if;
  if e.review_status <> 'APPROVED' or e.mapped_resource is null then
    raise exception 'edit % is not an applied edit to roll back to', p_edit_id;
  end if;

  r := public._apply_edit_payload(e.mapped_resource, public._edit_payload(e));
  return r;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants / RLS
--   * anon may only INSERT a fresh PENDING edit
--   * authenticated reviewers may read edits + run the review RPCs
--   * `resources` and `resource_revisions` untouched
-- ---------------------------------------------------------------------------
alter table public.resource_edits enable row level security;

create policy resource_edits_insert_anon
  on public.resource_edits for insert
  to anon, authenticated
  with check (review_status = 'PENDING');

create policy resource_edits_select_auth
  on public.resource_edits for select
  to authenticated
  using (true);

revoke execute on function public.approve_edit(bigint, text)          from public, anon;
revoke execute on function public.reject_edit(bigint, text, text)     from public, anon;
revoke execute on function public.rollback_to_edit(bigint, text)      from public, anon;
grant  execute on function public.approve_edit(bigint, text)          to authenticated;
grant  execute on function public.reject_edit(bigint, text, text)     to authenticated;
grant  execute on function public.rollback_to_edit(bigint, text)      to authenticated;

commit;
