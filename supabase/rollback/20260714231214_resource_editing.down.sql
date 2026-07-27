-- ============================================================================
-- Rollback for 20260714231214_resource_editing.sql
--
-- Reverses the resource_edits review pipeline. Safe to run in the Supabase SQL
-- Editor. Kept in supabase/rollback/ (NOT supabase/migrations/) so the Supabase
-- CLI does not try to apply it as a forward migration.
--
-- Drops only what the up-migration created; `resources` and `resource_revisions`
-- are untouched. Dropping resource_edits also removes its RLS policies + indexes.
-- ============================================================================

begin;

drop function if exists public.rollback_to_edit(bigint, text);
drop function if exists public.reject_edit(bigint, text, text);
drop function if exists public.approve_edit(bigint, text);
drop function if exists public._edit_payload(public.resource_edits);
drop function if exists public._apply_edit_payload(bigint, jsonb);

drop view if exists public.resource_change_log;
drop view if exists public.resource_edit_counts;
drop view if exists public.new_resources_queue;
drop view if exists public.resource_edits_queue;

drop table if exists public.resource_edits;  -- also drops its policies + indexes

commit;
