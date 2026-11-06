insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-installers', 'product-installers', false, 1073741824,
   array[
     'application/x-apple-diskimage',
     'application/x-pkg',
     'application/x-msi',
     'application/vnd.microsoft.portable-executable'
   ]),
  ('public-media', 'public-media', false, 20971520,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;
