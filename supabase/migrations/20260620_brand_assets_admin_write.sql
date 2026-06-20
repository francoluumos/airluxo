-- The brand-assets bucket was service-role-write only (the ingest edge fn). To let the
-- founder upload brand logos / car pictures from Brand & pitch in the browser, allow
-- admins to write to it. Public read stays; only is_admin() may insert/update/delete.
-- Folder convention: <partnerId>/logo, <partnerId>/brand-logos/*, <partnerId>/cars/<listing>/*.
create policy "brand_assets_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.is_admin());

create policy "brand_assets_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-assets' and public.is_admin())
  with check (bucket_id = 'brand-assets' and public.is_admin());

create policy "brand_assets_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and public.is_admin());
