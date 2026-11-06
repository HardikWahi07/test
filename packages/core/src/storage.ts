import { createClient } from "@supabase/supabase-js";

function storageClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase URL and server-only service role key are required");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createInstallerDownloadUrl(storagePath: string) {
  const { data, error } = await storageClient()
    .storage.from("product-installers")
    .createSignedUrl(storagePath, 60, { download: true });
  if (error) throw new Error(`Could not create installer download URL: ${error.message}`);
  return data.signedUrl;
}

export async function uploadStoredObject(input: {
  bucket: string;
  storagePath: string;
  file: File;
  contentType: string;
}) {
  const { error } = await storageClient()
    .storage.from(input.bucket)
    .upload(input.storagePath, input.file, {
      contentType: input.contentType,
      upsert: false,
    });
  if (error) throw new Error(`Could not upload installer: ${error.message}`);
}

export async function createMediaUrl(storagePath: string) {
  const { data, error } = await storageClient()
    .storage.from("public-media")
    .createSignedUrl(storagePath, 300);
  if (error) throw new Error(`Could not create media URL: ${error.message}`);
  return data.signedUrl;
}

export async function removeStoredObject(bucket: string, storagePath: string) {
  const { error } = await storageClient().storage.from(bucket).remove([storagePath]);
  if (error) throw new Error(`Could not remove stored object: ${error.message}`);
}
