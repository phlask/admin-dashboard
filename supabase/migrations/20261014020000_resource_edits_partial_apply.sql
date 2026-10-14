-- ============================================================================
-- Approving an edit must not wipe the fields it doesn't mention (#50).
--
-- `_edit_payload` emitted a key for EVERY mirrored column, NULLs included, and
-- `_apply_edit_payload` merges with `cur || payload`, so an edit that only set
-- `name` nulled the resource's address, coordinates, description, ... and the
-- resource dropped off the map. It only worked because phlask-map happens to
-- send complete snapshots.
--
-- New semantics:
--   * a NULL column on an edit means "no change" (top-level keys only, so
--     nested JSON like water.tags is applied exactly as submitted);
--   * clearing a field on purpose is explicit: list it in `cleared_fields`.
--     The admin dashboard fills this in when a reviewer saves a proposal with
--     a field left empty.
--
-- rollback_to_edit uses the same payload, so rolling back to a partial edit no
-- longer wipes fields either.
-- ============================================================================

begin;

alter table public.resource_edits
  add column cleared_fields text[] not null default '{}';

comment on column public.resource_edits.cleared_fields is
  'Mirrored resource columns this edit deliberately sets to NULL. A NULL column '
  'NOT listed here means "leave the current value unchanged".';

-- The queue views are `select e.*`, whose column list is fixed when the view
-- is created, so they must be recreated for the new column to show up. (CREATE
-- OR REPLACE can't be used: the new column would land before
-- current_resource.) Keep security_invoker and the reviewer-only grants.
drop view public.resource_edits_queue;
drop view public.new_resources_queue;

create view public.resource_edits_queue
  with (security_invoker = true)
  as
    select e.*, to_jsonb(r.*) as current_resource
    from public.resource_edits e
    join public.resources r on r.id = e.mapped_resource
    where e.review_status = 'PENDING' and e.mapped_resource is not null;

create view public.new_resources_queue
  with (security_invoker = true)
  as
    select e.*
    from public.resource_edits e
    where e.review_status = 'PENDING' and e.mapped_resource is null;

revoke all on public.resource_edits_queue from anon;
revoke all on public.new_resources_queue  from anon;
grant select on public.resource_edits_queue to authenticated;
grant select on public.new_resources_queue  to authenticated;

create or replace function public._edit_payload(e public.resource_edits)
returns jsonb language sql immutable as $$
  with mirrored as (
    select to_jsonb(e)
      - 'id' - 'mapped_resource' - 'review_status' - 'submitted_by'
      - 'submitted_at' - 'reviewed_by' - 'reviewed_at' - 'review_notes'
      - 'cleared_fields' as doc
  )
  select
    -- set fields: every non-null mirrored column
    coalesce(
      (select jsonb_object_agg(kv.key, kv.value)
         from mirrored, jsonb_each(mirrored.doc) kv
        where kv.value <> 'null'::jsonb),
      '{}'::jsonb
    )
    ||
    -- cleared fields: explicit NULLs, restricted to real mirrored columns
    coalesce(
      (select jsonb_object_agg(f, null)
         from mirrored, unnest(e.cleared_fields) f
        where mirrored.doc ? f),
      '{}'::jsonb
    );
$$;

commit;
