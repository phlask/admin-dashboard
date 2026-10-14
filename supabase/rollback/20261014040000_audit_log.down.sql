-- Rollback for 20261014040000_audit_log.sql
-- WARNING: drops the audit history. Export public.audit_log first if needed.

begin;

drop trigger if exists resource_edits_audit on public.resource_edits;
drop trigger if exists resources_audit on public.resources;
drop trigger if exists providers_audit on public.providers;
drop function if exists public._audit_row_change();

-- The append-only guard would block dropping rows, not the table itself.
drop table if exists public.audit_log;
drop function if exists public._audit_log_immutable();

-- Restore the 20261014030000 rollback_to_edit (without audit tagging).
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

  if e.applied_snapshot is not null then
    r := public._apply_edit_payload(
           e.mapped_resource,
           e.applied_snapshot - 'id' - 'date_created' - 'creator' - 'last_modified'
         );
  else
    r := public._apply_edit_payload(e.mapped_resource, public._edit_payload(e));
  end if;

  return r;
end;
$$;

commit;
