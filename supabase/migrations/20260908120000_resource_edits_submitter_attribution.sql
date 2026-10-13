-- ============================================================================
-- Populate `resource_edits.submitted_by` from the request's JWT.
--
-- Nothing was ever setting this column: submitting clients don't send it, and
-- the admin dashboard only reads edits, never creates them. The result is that
-- every row arrives with submitted_by = null, so the dashboard's "Top
-- submitters" panel has nothing to attribute and the review detail page can't
-- say who proposed a change.
--
-- `creator` is not a substitute — it's a mirrored ResourceEntry field carried
-- along in the proposed snapshot, so it describes who created the *resource*
-- (values are ingest sources like 'phlask_app'), not who submitted the edit.
--
-- This fills the column from the JWT on insert whenever the submitter is
-- signed in, without requiring any client change. Anonymous submissions still
-- land with submitted_by = null — there is genuinely no identity to record —
-- so attributing those requires the submitting client to send something.
-- ============================================================================

begin;

create or replace function public._resource_edits_set_submitter()
returns trigger
language plpgsql
as $$
declare
  claims jsonb;
begin
  -- Only fill a blank; never overwrite a value the client sent deliberately.
  if new.submitted_by is not null and new.submitted_by <> '' then
    return new;
  end if;

  -- Unset (e.g. a direct psql insert) or unparseable claims are not an error
  -- here; the column just stays null.
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    claims := null;
  end;

  -- nullif per-claim, not around the coalesce: an empty-string `email` must
  -- fall through to `sub` rather than swallowing it.
  new.submitted_by := coalesce(
    nullif(claims ->> 'email', ''),
    nullif(claims ->> 'sub', '')
  );

  return new;
end;
$$;

-- BEFORE INSERT so the value is stored on the row itself, and so a plain
-- `insert` still returns the row (no RETURNING surprises for clients).
drop trigger if exists resource_edits_set_submitter on public.resource_edits;

create trigger resource_edits_set_submitter
  before insert on public.resource_edits
  for each row
  execute function public._resource_edits_set_submitter();

commit;
