import { readSessionToken } from "./session";
import { getSupabaseAdmin } from "./supabase";

export async function getAdministratorId(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.match(/(?:^|;\s*)veyrith_admin=([^;]+)/)?.[1];
  if (!token) return null;
  const session = await readSessionToken(decodeURIComponent(token), "administrator");
  if (!session) return null;
  const { data: administrator, error } = await getSupabaseAdmin()
    .from("Administrator")
    .select("id")
    .eq("id", session.sub)
    .eq("isActive", true)
    .maybeSingle();
  if (error) throw new Error(`Could not verify administrator session: ${error.message}`);
  return administrator?.id ?? null;
}

export function adminCookie(token: string, maxAge: number) {
  return `veyrith_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function getCustomerId(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie.match(/(?:^|;\s*)veyrith_customer=([^;]+)/)?.[1];
  if (!token) return null;
  const session = await readSessionToken(decodeURIComponent(token), "customer");
  if (!session) return null;
  const { data: customer, error } = await getSupabaseAdmin()
    .from("Customer")
    .select("id")
    .eq("id", session.sub)
    .not("emailVerifiedAt", "is", null)
    .maybeSingle();
  if (error) throw new Error(`Could not verify customer session: ${error.message}`);
  return customer?.id ?? null;
}

export function customerCookie(token: string, maxAge: number) {
  return `veyrith_customer=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
