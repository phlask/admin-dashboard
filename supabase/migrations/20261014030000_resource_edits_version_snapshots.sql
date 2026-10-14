-- ============================================================================
-- Exact version snapshots for rollback (#6, #7).
--
-- rollback_to_edit re-applied the edit's own payload. Since edits became
-- partial (20261014020000: NULL = "no change"), re-applying a name-only edit
-- would restore just the name, not the version that edit produced.
--
-- approve_edit now records `applied_snapshot`: the full resources row exactly
-- as it stood right after the approval. rollback_to_edit restores that
-- snapshot verbatim (every column, NULLs included), so "roll back to this
-- version" means what it says. Edits approved before this migration have no
-- snapshot and fall back to re-applying their payload, as before.
-- ============================================================================

begin;

alter table public.resource_edits
  add column applied_snapshot jsonb;

comment on column public.resource_edits.applied_snapshot is
  'The full resources row immediately after this edit was approved; used by '
  'rollback_to_edit to restore that exact version.';

-- Keep the new bookkeeping column out of the mirrored payload.
create or replace function public._edit_payload(e public.resource_edits)
returns jsonb language sql immutable as $$
  with mirrored as (
    select to_jsonb(e)
      - 'id' - 'mapped_resource' - 'review_status' - 'submitted_by'
      - 'submitted_at' - 'reviewed_by' - 'reviewed_at' - 'review_notes'
      - 'cleared_fields' - 'applied_snapshot' as doc
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
    -- NEW site: insert from the mirrored fields (resources.id from its default).
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
    set review_status = 'APPROVED', reviewed_by = p_reviewer, reviewed_at = now(),
        applied_snapshot = to_jsonb(r)
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

  if e.applied_snapshot is not null then
    -- Restore every column of that version; identity fields are preserved by
    -- _apply_edit_payload and last_modified is stamped now().
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

revoke execute on function public.approve_edit(bigint, text)     from public, anon;
revoke execute on function public.rollback_to_edit(bigint, text) from public, anon;
grant  execute on function public.approve_edit(bigint, text)     to authenticated;
grant  execute on function public.rollback_to_edit(bigint, text) to authenticated;

commit;
