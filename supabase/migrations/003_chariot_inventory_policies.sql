create policy "chariot_properties_public_read_published"
on public.chariot_properties for select
to anon, authenticated
using (status = 'published');

create policy "chariot_property_images_public_read_published"
on public.chariot_property_images for select
to anon, authenticated
using (property_id in (select id from public.chariot_properties where status = 'published'));