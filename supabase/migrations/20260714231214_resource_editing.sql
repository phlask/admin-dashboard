-- ============================================================================
-- Resource-editing review layer — built on the EXISTING `resource_revisions`
-- table (discovered in the live Supabase schema).
--
-- This SUPERSEDES the earlier resource_edits/resource_history draft, which did
-- not match production. What actually exists:
--
--   resources           id bigint PK, version int (SCHEMA version, per
--                        ResourceEntry), status = OPERATIONAL | ... , ...
--
--   resource_revisions  a full copy of the `resources` columns, PLUS
--                        mapped_resource  bigint -> resources.id  (null = new site)
--                        mapped_resources bigint  (dup of mapped_resource today)
--                        status  = REVIEW state: PENDING | APPROVED | REJECTED
--                        ^ NOTE: `status` means OPERATIONAL status in `resources`
--                          but REVIEW status here — the column name is overloaded.
--
-- This migration is ADDITIVE and NON-DESTRUCTIVE: it creates views + two
-- review-state RPCs only. It creates no tables, alters no existing tables, and
-- changes no RLS. Everything runs in one transaction.
--
-- DEFERRED ON PURPOSE: applying an APPROVED revision's data into `resources`
-- (the copy + any version bump + rollback) is NOT automated here. Because
-- `status` is overloaded and `version` is a schema version (not a per-resource
-- counter), the write-path semantics need the data circle to confirm before we
-- touch production `resources`. Proposed design is sketched in comments below.
-- Design + discussion: phlask/admin-dashboard#3.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Review queues (plain views — always fresh).
-- ---------------------------------------------------------------------------

-- Pending edits to an existing resource, joined to that resource so the
-- dashboard can render the existing-vs-suggested compare.
create or replace view public.revision_edits_queue as
  select
    rev.*,
    res.name        as current_name,
    to_jsonb(res.*) as current_resource
  from public.resource_revisions rev
  join public.resources res on res.id = rev.mapped_resource
  where rev.status = 'PENDING' and rev.mapped_resource is not null;

-- Pending brand-new site submissions (not yet mapped to a resource).
create or replace view public.revision_new_queue as
  select rev.*
  from public.resource_revisions rev
  where rev.status = 'PENDING' and rev.mapped_resource is null;

-- Pending-edit count per resource, for list badges.
create or replace view public.revision_edit_counts as
  select mapped_resource as resource_id, count(*) as pending_count
  from public.resource_revisions
  where status = 'PENDING' and mapped_resource is not null
  group by mapped_resource;

-- Approved / rejected revisions per resource = the per-resource change log.
create or replace view public.resource_change_log as
  select
    mapped_resource as resource_id,
    id              as revision_id,
    creator,
    last_modifier,
    last_modified,
    status
  from public.resource_revisions
  where status in ('APPROVED', 'REJECTED')
  order by mapped_resource, last_modified desc;

-- ---------------------------------------------------------------------------
-- Review-state RPCs.
--
-- These transition a revision's review `status` only (PENDING -> APPROVED /
-- REJECTED) and stamp the reviewer. They intentionally do NOT copy the
-- revision into `resources`.
--
-- PROPOSED (deferred) apply-path, once the data circle confirms semantics:
--   on APPROVE of an edit  (mapped_resource not null):
--       copy the ResourceEntry columns from the revision into
--       resources WHERE id = mapped_resource;  (operational-status handling TBD)
--   on APPROVE of a new site (mapped_resource null):
--       insert a new resources row from the revision, then set
--       resource_revisions.mapped_resource = new id;
--   rollback: re-apply a prior APPROVED revision's columns to its resource.
-- Left out here so we don't guess a production write. See #3.
--
-- SECURITY DEFINER so authenticated reviewers can run them without a direct
-- UPDATE grant on resource_revisions.
--
-- CAVEAT: if `resource_revisions.status` is a constrained enum that does not
-- already include 'REJECTED', that value must be added to the enum first; this
-- migration assumes the column accepts it (text, or an enum containing it).
-- ---------------------------------------------------------------------------

create or replace function public.approve_revision(p_revision_id bigint, p_reviewer text)
returns public.resource_revisions
language plpgsql
security definer
set search_path = public
as $$
declare
  rev public.resource_revisions;
begin
  update public.resource_revisions
    set status = 'APPROVED', last_modifier = p_reviewer, last_modified = now()
    where id = p_revision_id and status = 'PENDING'
    returning * into rev;
  if not found then
    raise exception 'revision % not found or not PENDING', p_revision_id;
  end if;
  return rev;
end;
$$;

create or replace function public.reject_revision(p_revision_id bigint, p_reviewer text)
returns public.resource_revisions
language plpgsql
security definer
set search_path = public
as $$
declare
  rev public.resource_revisions;
begin
  update public.resource_revisions
    set status = 'REJECTED', last_modifier = p_reviewer, last_modified = now()
    where id = p_revision_id and status = 'PENDING'
    returning * into rev;
  if not found then
    raise exception 'revision % not found or not PENDING', p_revision_id;
  end if;
  return rev;
end;
$$;

grant execute on function public.approve_revision(bigint, text) to authenticated;
grant execute on function public.reject_revision(bigint, text)  to authenticated;

commit;
