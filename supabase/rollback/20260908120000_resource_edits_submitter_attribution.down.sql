-- Rollback for 20260908120000_resource_edits_submitter_attribution.sql
-- Leaves already-attributed rows alone; only stops new inserts being filled in.

begin;

drop trigger if exists resource_edits_set_submitter on public.resource_edits;
drop function if exists public._resource_edits_set_submitter();

commit;
