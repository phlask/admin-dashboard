-- ============================================================================
-- Audit log (#48): who did what, to which record, when, and what changed.
--
-- Rows are written by AFTER triggers on resource_edits, resources and
-- providers, so every change is captured no matter which client made it (the
-- dashboard, phlask-map, the SQL editor). The table is append-only:
--   * no INSERT/UPDATE/DELETE grants or policies for anon / authenticated —
--     only the SECURITY DEFINER trigger function writes to it;
--   * a guard trigger rejects UPDATE / DELETE / TRUNCATE for everyone,
--     including the service role, so history can't be rewritten quietly.
-- Signed-in reviewers can read it (RLS select policy).
--
-- Actions: INSERT / UPDATE / DELETE, plus APPROVE / REJECT for review status
-- transitions on resource_edits and ROLLBACK for rollback_to_edit (which tags
-- its write via the transaction-local `app.audit_action` setting).
-- ============================================================================

begin;

create table public.audit_log (
  id             bigint generated always as identity primary key,
  occurred_at    timestamptz not null default now(),
  actor          text not null,
  actor_id       uuid,
  action         text not null,
  table_name     text not null,
  record_id      text,
  changed_fields text[] not null default '{}',
  old_data       jsonb,
  new_data       jsonb
);

create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_actor_idx on public.audit_log (actor);
create index audit_log_action_idx on public.audit_log (action);

comment on table public.audit_log is
  'Append-only activity log written by triggers; see 20261014040000_audit_log.sql.';

alter table public.audit_log enable row level security;

create policy audit_log_select_auth
  on public.audit_log for select
  to authenticated
  using (true);

revoke all on public.audit_log from anon;
revoke insert, update, delete, truncate on public.audit_log from authenticated;
grant select on public.audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Append-only guard.
-- ---------------------------------------------------------------------------
create or replace function public._audit_log_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_log is append-only (% is not allowed)', tg_op;
end;
$$;

create trigger audit_log_no_update_delete
  before update or delete on public.audit_log
  for each row execute function public._audit_log_immutable();

create trigger audit_log_no_truncate
  before truncate on public.audit_log
  for each statement execute function public._audit_log_immutable();

-- ---------------------------------------------------------------------------
-- Row-change recorder.
-- ---------------------------------------------------------------------------
create or replace function public._audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  claims  jsonb;
  old_doc jsonb;
  new_doc jsonb;
  changed text[] := '{}';
  act     text;
  who_id  uuid;
begin
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception when others then
    claims := null;
  end;

  if tg_op in ('UPDATE', 'DELETE') then
    old_doc := to_jsonb(old) - 'applied_snapshot';
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    new_doc := to_jsonb(new) - 'applied_snapshot';
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k order by k), '{}')
      into changed
      from (
        select key as k from jsonb_each(new_doc)
        where new_doc -> key is distinct from old_doc -> key
      ) diff;
    -- Ignore no-op updates (and ones that only touched bookkeeping).
    if changed = '{}' or changed <@ array['last_modified'] then
      return null;
    end if;
  end if;

  act := nullif(current_setting('app.audit_action', true), '');
  if act is null then
    act := tg_op;
    if tg_table_name = 'resource_edits' and tg_op = 'UPDATE'
       and old_doc ->> 'review_status' is distinct from new_doc ->> 'review_status' then
      act := case new_doc ->> 'review_status'
               when 'APPROVED' then 'APPROVE'
               when 'REJECTED' then 'REJECT'
               else 'UPDATE'
             end;
    end if;
  end if;

  begin
    who_id := nullif(claims ->> 'sub', '')::uuid;
  exception when others then
    who_id := null;
  end;

  insert into public.audit_log (
    actor, actor_id, action, table_name, record_id, changed_fields, old_data, new_data
  ) values (
    coalesce(
      nullif(claims ->> 'email', ''),
      nullif(claims ->> 'sub', ''),
      nullif(claims ->> 'role', ''),
      'system:' || current_user
    ),
    who_id,
    act,
    tg_table_name,
    coalesce(new_doc ->> 'id', old_doc ->> 'id'),
    changed,
    old_doc,
    new_doc
  );

  return null;
end;
$$;

revoke execute on function public._audit_row_change() from public, anon, authenticated;

create trigger resource_edits_audit
  after insert or update or delete on public.resource_edits
  for each row execute function public._audit_row_change();

create trigger resources_audit
  after insert or update or delete on public.resources
  for each row execute function public._audit_row_change();

create trigger providers_audit
  after insert or update or delete on public.providers
  for each row execute function public._audit_row_change();

-- ---------------------------------------------------------------------------
-- Tag rollbacks so they read as ROLLBACK, not a plain UPDATE.
-- (Same body as 20261014030000 plus the set_config calls.)
-- ---------------------------------------------------------------------------
create or replace function public.rollback_to_edit(p_edit_id bigint, p_actor text)
returns public.resources
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.resource_edits;
  r public.resources;
begin
  select * into e from public.resource_edits where id = p_edit_id;
  if not found then
    raise exception 'edit % not found', p_edit_id;
  end if;
  if e.review_status <> 'APPROVED' or e.mapped_resource is null then
    raise exception 'edit % is not an applied edit to roll back to', p_edit_id;
  end if;

  perform set_config('app.audit_action', 'ROLLBACK', true);

  if e.applied_snapshot is not null then
    r := public._apply_edit_payload(
           e.mapped_resource,
           e.applied_snapshot - 'id' - 'date_created' - 'creator' - 'last_modified'
         );
  else
    r := public._apply_edit_payload(e.mapped_resource, public._edit_payload(e));
  end if;

  perform set_config('app.audit_action', '', true);

  return r;
end;
$$;

revoke execute on function public.rollback_to_edit(bigint, text) from public, anon;
grant  execute on function public.rollback_to_edit(bigint, text) to authenticated;

commit;
