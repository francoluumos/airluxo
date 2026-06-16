-- Let the founder remove a not-relevant inspiration row from the board.
create or replace function public.admin_delete_inspiration(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  delete from public.content_inspiration where id = p_id;
end $$;
