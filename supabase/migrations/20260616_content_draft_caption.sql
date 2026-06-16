-- Let the founder edit a draft's caption in the approval queue (U7).
create or replace function public.admin_set_draft_caption(p_id uuid, p_caption text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  update public.content_drafts set caption = p_caption where id = p_id;
end $$;
