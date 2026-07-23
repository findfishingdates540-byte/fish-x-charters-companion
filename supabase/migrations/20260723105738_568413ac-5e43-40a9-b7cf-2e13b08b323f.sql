create or replace function public.withdraw_dispute(_dispute_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.disputes%rowtype;
begin
  select * into d from public.disputes where id = _dispute_id;
  if not found then
    raise exception 'Dispute not found';
  end if;
  if d.opened_by <> auth.uid() then
    raise exception 'Only the opener can withdraw this dispute';
  end if;
  if d.status not in ('open','investigating') then
    raise exception 'Dispute cannot be withdrawn in status %', d.status;
  end if;
  update public.disputes
     set status = 'withdrawn',
         resolved_at = now(),
         updated_at = now()
   where id = _dispute_id;
end;
$$;

revoke all on function public.withdraw_dispute(uuid) from public, anon;
grant execute on function public.withdraw_dispute(uuid) to authenticated;