import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@veyrith/core";
import { verifyPassword } from "@veyrith/core/password";
import { adminCookie } from "@veyrith/core/admin-session";
import { createSessionToken, SESSION_TTL } from "@veyrith/core/session";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const { data: administrator, error } = await getSupabaseAdmin()
    .from("Administrator")
    .select("id,email,passwordHash,isActive")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(`Could not load administrator account: ${error.message}`);

  if (
    !administrator ||
    !administrator.isActive ||
    !(await verifyPassword(password, administrator.passwordHash))
  ) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), { status: 303 });
  }

  const token = await createSessionToken({ sub: administrator.id, role: "administrator" });
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.headers.append("set-cookie", adminCookie(token, SESSION_TTL));
  response.headers.set("cache-control", "no-store");
  return response;
}
