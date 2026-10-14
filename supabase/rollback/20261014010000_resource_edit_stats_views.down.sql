-- Rollback for 20261014010000_resource_edit_stats_views.sql

begin;

drop view if exists public.resource_edit_pending_by_type;
drop view if exists public.resource_edit_approver_counts;
drop view if exists public.resource_edit_submitter_counts;

commit;
