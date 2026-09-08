-- ============================================================================
-- resource_provider_counts: how many resources each provider is attributed to.
--
-- The dashboard previously selected every `resource_providers` row and tallied
-- them in JS. PostgREST caps a response at max-rows (1000 by default) and
-- returns the first page WITHOUT an error, so that tally silently under-reports
-- once the join table outgrows the cap.
--
-- That number is what the "remove provider" confirmation uses to warn that
-- resources are about to lose their "Provided by" credit, so an undercount
-- reads as "safe to delete" — the failure is both silent and destructive.
--
-- Mirrors the existing `resource_edit_counts` view.
-- ============================================================================

begin;

create or replace view public.resource_provider_counts
  with (security_invoker = true)
  as
    select provider_id, count(*) as resource_count
    from public.resource_providers
    group by provider_id;

grant select on public.resource_provider_counts to anon, authenticated;

commit;
