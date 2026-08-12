-- ============================================================================
-- resource_edits was missing an UPDATE policy for authenticated reviewers.
-- The review UI lets a reviewer tweak the proposed values before approving
-- (previously worked against `resource_revisions`); without this, those
-- writes are silently dropped by RLS (0 rows affected, no error) once the
-- app is pointed at `resource_edits` instead.
--
-- Scoped to PENDING rows only, and the check clause blocks flipping
-- review_status via this path (approve/reject must go through the RPCs,
-- which is where reviewed_by/reviewed_at get set).
-- ============================================================================

begin;

create policy resource_edits_update_pending_auth
  on public.resource_edits for update
  to authenticated
  using (review_status = 'PENDING')
  with check (review_status = 'PENDING');

commit;
