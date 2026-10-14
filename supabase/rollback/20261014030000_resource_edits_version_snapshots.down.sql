-- Rollback for 20261014030000_resource_edits_version_snapshots.sql
-- Restores the 20261014020000 payload function and the original approve /
-- rollback RPCs, then drops the snapshot column.

begin;

create or replace function public._edit_payload(e public.resource_edits)
returns jsonb language sql immutable as $$
  with mirrored as (
    select to_jsonb(e)
      - 'id' - 'mapped_resource' - 'review_status' - 'submitted_by'
      - 'submitted_at' - 'reviewed_by' - 'reviewed_at' - 'review_notes'
      - 'cleared_fields' as doc
  )
  select
    coalesce(
      (select jsonb_object_agg(kv.key, kv.value)
         from mirrored, jsonb_each(mirrored.doc) kv
        where kv.value <> 'null'::jsonb),
      '{}'::jsonb
    )
    ||
    coalesce(
      (select jsonb_object_agg(f, null)
         from mirrored, unnest(e.cleared_fields) f
        where mirrored.doc ? f),
      '{}'::jsonb
    );
$$;

create or replace function public.approve_edit(p_edit_id bigint, p_reviewer text)
returns public.resources
language plpgsql
security definer
set search_path = public
as $$
declare
  e   public.resource_edits;
  r   public.resources;
  new_id bigint;
begin
  select * into e from public.resource_edits where id = p_edit_id for update;
  if not found then
    raise exception 'edit % not found', p_edit_id;
  end if;
  if e.review_status <> 'PENDING' then
    raise exception 'edit % is % (expected PENDING)', p_edit_id, e.review_status;
  end if;

  if e.mapped_resource is not null then
    r := public._apply_edit_payload(e.mapped_resource, public._edit_payload(e));
  else
    insert into public.resources (
      version, date_created, creator, last_modified, last_modifier, source,
      verification, resource_type, address, city, state, zip_code, latitude,
      longitude, gp_id, images, guidelines, description, name, status,
      entry_type, hours, water, food, forage, bathroom
    )
    select
      s.version, coalesce(s.date_created, now()), s.creator, now(), s.last_modifier,
      s.source, s.verification, s.resource_type, s.address, s.city, s.state,
      s.zip_code, s.latitude, s.longitude, s.gp_id, s.images, s.guidelines,
      s.description, s.name, s.status, s.entry_type, s.hours, s.water, s.food,
      s.forage, s.bathroom
    from jsonb_populate_record(null::public.resources, public._edit_payload(e)) s
    returning id into new_id;

    update public.resource_edits set mapped_resource = new_id where id = e.id;
    select * into r from public.resources where id = new_id;
  end if;

  update public.resource_edits
    set review_status = 'APPROVED', reviewed_by = p_reviewer, reviewed_at = now()
    where id = e.id;

  return r;
end;
$$;

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

  r := public._apply_edit_payload(e.mapped_resource, public._edit_payload(e));
  return r;
end;
$$;

alter table public.resource_edits drop column if exists applied_snapshot;

commit;
