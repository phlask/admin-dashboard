-- ============================================================================
-- Make the resource_edits review views respect RLS.
--
-- The views created in 20260714231214_resource_editing.sql were created
-- without `security_invoker`, so Postgres evaluates them as the view owner
-- (postgres), which bypasses the RLS policies on `resource_edits`. Supabase
-- grants SELECT on new public views to `anon` by default, so any visitor
-- holding the publishable key could read every pending edit — including
-- `submitted_by` (an email once the submitter-attribution trigger lands) —
-- through `resource_edits_queue` / `new_resources_queue`, even though a
-- direct `select` on `resource_edits` returns nothing for them.
--
-- With security_invoker the views run with the caller's privileges, so the
-- existing `resource_edits_select_auth` policy (authenticated only) applies.
-- Mirrors `resource_provider_counts`, which was created this way.
-- ============================================================================

begin;

alter view public.resource_edits_queue set (security_invoker = true);
alter view public.new_resources_queue  set (security_invoker = true);
alter view public.resource_edit_counts set (security_invoker = true);
alter view public.resource_change_log  set (security_invoker = true);

-- Belt and braces: reviewers are the only audience for these views.
revoke all on public.resource_edits_queue from anon;
revoke all on public.new_resources_queue  from anon;
revoke all on public.resource_edit_counts from anon;
revoke all on public.resource_change_log  from anon;

commit;
