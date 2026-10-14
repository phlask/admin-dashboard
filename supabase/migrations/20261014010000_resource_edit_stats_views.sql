-- ============================================================================
-- Aggregate views backing the dashboard's review stats (#43).
--
-- The dashboard previously pulled every pending edit plus the whole change log
-- and tallied submitters / approvers / outstanding-by-type in JS. PostgREST
-- caps a response at max-rows (1000 by default) WITHOUT an error, so those
-- tallies silently under-report once the tables outgrow the cap — the same
-- failure `resource_provider_counts` was introduced to fix.
--
-- security_invoker so the views honour resource_edits RLS (reviewers only).
-- ============================================================================

begin;

-- Submissions per submitter (all review states). Anonymous submissions have
-- no submitted_by and are left out rather than lumped under one label.
create or replace view public.resource_edit_submitter_counts
  with (security_invoker = true)
  as
    select submitted_by, count(*) as submission_count
    from public.resource_edits
    where submitted_by is not null and submitted_by <> ''
    group by submitted_by;

-- Approvals per reviewer.
create or replace view public.resource_edit_approver_counts
  with (security_invoker = true)
  as
    select reviewed_by, count(*) as approval_count
    from public.resource_edits
    where review_status = 'APPROVED'
      and reviewed_by is not null and reviewed_by <> ''
    group by reviewed_by;

-- PENDING submissions (edits + new sites) per resource type.
create or replace view public.resource_edit_pending_by_type
  with (security_invoker = true)
  as
    select resource_type, count(*) as pending_count
    from public.resource_edits
    where review_status = 'PENDING'
    group by resource_type;

revoke all on public.resource_edit_submitter_counts from anon;
revoke all on public.resource_edit_approver_counts  from anon;
revoke all on public.resource_edit_pending_by_type  from anon;
grant select on public.resource_edit_submitter_counts to authenticated;
grant select on public.resource_edit_approver_counts  to authenticated;
grant select on public.resource_edit_pending_by_type  to authenticated;

commit;
