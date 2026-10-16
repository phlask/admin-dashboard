-- Rollback for 20261014020000_resource_edits_partial_apply.sql
-- WARNING: restores whole-record overwrite on approve (see #50).

begin;

create or replace function public._edit_payload(e public.resource_edits)
returns jsonb language sql immutable as $$
  select to_jsonb(e)
    - 'id' - 'mapped_resource' - 'review_status' - 'submitted_by'
    - 'submitted_at' - 'reviewed_by' - 'reviewed_at' - 'review_notes';
$$;

create or replace view public.resource_edit_pending_by_type
  with (security_invoker = true)
  as
    select resource_type, count(*) as pending_count
    from public.resource_edits
    where review_status = 'PENDING'
    group by resource_type;

drop view if exists public.resource_edits_queue;
drop view if exists public.new_resources_queue;

alter table public.resource_edits drop column if exists cleared_fields;

create view public.resource_edits_queue
  with (security_invoker = true)
  as
    select e.*, to_jsonb(r.*) as current_resource
    from public.resource_edits e
    join public.resources r on r.id = e.mapped_resource
    where e.review_status = 'PENDING' and e.mapped_resource is not null;

create view public.new_resources_queue
  with (security_invoker = true)
  as
    select e.*
    from public.resource_edits e
    where e.review_status = 'PENDING' and e.mapped_resource is null;

revoke all on public.resource_edits_queue from anon;
revoke all on public.new_resources_queue  from anon;
grant select on public.resource_edits_queue to authenticated;
grant select on public.new_resources_queue  to authenticated;

commit;
