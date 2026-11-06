import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@veyrith/core";
import { customerCookie } from "@veyrith/core/admin-session";
import { verifyPassword } from "@veyrith/core/password";
import { createSessionToken, SESSION_TTL } from "@veyrith/core/session";

const credentials = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const parsed = credentials.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const { data: customer, error } = await getSupabaseAdmin()
    .from("Customer")
    .select("id,passwordHash,emailVerifiedAt")
    .eq("email", parsed.data.email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Could not load customer account: ${error.message}`);
  if (!customer?.passwordHash || !(await verifyPassword(parsed.data.password, customer.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (!customer.emailVerifiedAt) {
    return NextResponse.json({ error: "Verify your email address before signing in. Use the resend verification option if needed." }, { status: 403 });
  }
  const token = await createSessionToken({ sub: customer.id, role: "customer" });
  const response = NextResponse.json({ ok: true });
  response.headers.append("set-cookie", customerCookie(token, SESSION_TTL));
  response.headers.set("cache-control", "no-store");
  return response;
}
