-- ============================================================================
-- RLS policies so signed-in maintainers can manage the providers list from the
-- admin dashboard.
--
-- Today `providers` has RLS enabled with (at most) a public read policy, so any
-- INSERT/UPDATE/DELETE — including from a signed-in admin — fails with:
--   42501: new row violates row-level security policy for table "providers"
--
-- Reads stay public: the map's "Provided By" component fetches providers with
-- the anon key and must keep working.
-- ============================================================================

begin;

-- Ensure RLS is on (no-op if it already is).
alter table public.providers enable row level security;

-- Public read — required by phlask-map's ProvidedBy component.
drop policy if exists providers_select_public on public.providers;
create policy providers_select_public
  on public.providers for select
  to anon, authenticated
  using (true);

-- Signed-in maintainers manage the list from the admin dashboard.
drop policy if exists providers_insert_auth on public.providers;
create policy providers_insert_auth
  on public.providers for insert
  to authenticated
  with check (true);

drop policy if exists providers_update_auth on public.providers;
create policy providers_update_auth
  on public.providers for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists providers_delete_auth on public.providers;
create policy providers_delete_auth
  on public.providers for delete
  to authenticated
  using (true);

commit;
