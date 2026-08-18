-- ============================================================================
-- Enforce at most one PENDING resource_edits row per mapped_resource.
--
-- Previously, nothing stopped a second "save" on the same resource from
-- inserting a competing PENDING row instead of overwriting the first one
-- (resource_edits_insert_anon just allows INSERT; there was no uniqueness
-- constraint on mapped_resource). Reviewers were seeing e.g. "2 pending
-- edits" for a single resource when only one made sense.
--
-- Fix, in two layers:
--   1. A BEFORE INSERT trigger that, when a PENDING edit already exists for
--      the incoming row's mapped_resource, updates that existing row in
--      place (overwriting the proposed values, bumping submitted_by/at) and
--      skips the insert entirely. This makes "save" behave as an upsert for
--      any client, with no client-side changes required.
--   2. A partial unique index on (mapped_resource) where PENDING, as a
--      backstop against a race between two concurrent inserts slipping past
--      the trigger (the second insert fails loudly instead of silently
--      creating a duplicate).
--
-- Also cleans up any duplicates that already exist: for each resource with
-- multiple PENDING edits, keeps the most recently submitted one and deletes
-- the rest (pre-production data, no need to preserve them).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Resolve existing duplicates before the unique index can be created.
-- ---------------------------------------------------------------------------
with ranked as (
  select id,
         row_number() over (
           partition by mapped_resource
           order by submitted_at desc, id desc
         ) as rn
  from public.resource_edits
  where review_status = 'PENDING' and mapped_resource is not null
)
delete from public.resource_edits e
using ranked
where e.id = ranked.id and ranked.rn > 1;

-- ---------------------------------------------------------------------------
-- Backstop: at most one PENDING edit per resource.
-- ---------------------------------------------------------------------------
create unique index resource_edits_one_pending_per_resource
  on public.resource_edits (mapped_resource)
  where review_status = 'PENDING' and mapped_resource is not null;

-- ---------------------------------------------------------------------------
-- Make a second "save" overwrite the existing pending edit instead of
-- inserting a competitor.
-- ---------------------------------------------------------------------------
create or replace function public._resource_edits_dedupe_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id bigint;
begin
  if new.review_status = 'PENDING' and new.mapped_resource is not null then
    select id into existing_id
    from public.resource_edits
    where mapped_resource = new.mapped_resource
      and review_status = 'PENDING'
    for update;

    if existing_id is not null then
      update public.resource_edits set
        submitted_by  = new.submitted_by,
        submitted_at  = now(),
        version       = new.version,
        date_created  = new.date_created,
        creator       = new.creator,
        last_modified = new.last_modified,
        last_modifier = new.last_modifier,
        source        = new.source,
        verification  = new.verification,
        resource_type = new.resource_type,
        address       = new.address,
        city          = new.city,
        state         = new.state,
        zip_code      = new.zip_code,
        latitude      = new.latitude,
        longitude     = new.longitude,
        gp_id         = new.gp_id,
        images        = new.images,
        guidelines    = new.guidelines,
        description   = new.description,
        name          = new.name,
        status        = new.status,
        entry_type    = new.entry_type,
        hours         = new.hours,
        water         = new.water,
        food          = new.food,
        forage        = new.forage,
        bathroom      = new.bathroom
      where id = existing_id;

      return null; -- row already applied via UPDATE; skip the INSERT
    end if;
  end if;

  return new;
end;
$$;

create trigger resource_edits_dedupe_pending
  before insert on public.resource_edits
  for each row
  execute function public._resource_edits_dedupe_pending();

commit;
