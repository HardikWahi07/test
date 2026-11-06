import { NextResponse } from "next/server";
import { z } from "zod";
import { customerCookie } from "@veyrith/core/admin-session";
import { verifyCustomerEmail } from "@veyrith/core/email-verification";
import { createSessionToken, SESSION_TTL } from "@veyrith/core/session";

const verification = z.object({ token: z.string().min(40).max(100) });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = verification.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Verification link is invalid or expired." }, { status: 400 });
  const customer = await verifyCustomerEmail(parsed.data.token);
  if (!customer) return NextResponse.json({ error: "Verification link is invalid or expired." }, { status: 400 });
  const token = await createSessionToken({ sub: customer.id, role: "customer" });
  const response = NextResponse.json({ ok: true });
  response.headers.append("set-cookie", customerCookie(token, SESSION_TTL));
  response.headers.set("cache-control", "no-store");
  return response;
}
