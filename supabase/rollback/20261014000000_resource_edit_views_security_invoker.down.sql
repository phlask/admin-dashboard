-- Rollback for 20261014000000_resource_edit_views_security_invoker.sql
-- WARNING: restores the RLS-bypassing behaviour described in the up-migration.

begin;

alter view public.resource_edits_queue reset (security_invoker);
alter view public.new_resources_queue  reset (security_invoker);
alter view public.resource_edit_counts reset (security_invoker);
alter view public.resource_change_log  reset (security_invoker);

grant select on public.resource_edits_queue to anon;
grant select on public.new_resources_queue  to anon;
grant select on public.resource_edit_counts to anon;
grant select on public.resource_change_log  to anon;

commit;
