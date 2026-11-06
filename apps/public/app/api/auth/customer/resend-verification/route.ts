import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@veyrith/core";
import { createVerificationToken, discardVerificationToken, sendVerificationEmail } from "@veyrith/core/email-verification";

const requestSchema = z.object({ email: z.string().email().max(254) });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid email address." }, { status: 400 });
  const { data: customer, error } = await getSupabaseAdmin()
    .from("Customer")
    .select("id,email,name,emailVerifiedAt")
    .eq("email", parsed.data.email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Could not load customer account: ${error.message}`);
  if (customer && !customer.emailVerifiedAt) {
    const token = await createVerificationToken(customer.id);
    if (token) {
      try {
        await sendVerificationEmail({ email: customer.email, name: customer.name, token });
      } catch (error) {
        await discardVerificationToken(token);
        console.error("Customer verification email could not be resent.", error);
        return NextResponse.json({ error: "Verification email could not be sent. Please try again later." }, { status: 503 });
      }
    }
  }
  return NextResponse.json({ sent: true });
}
