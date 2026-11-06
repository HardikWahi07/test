import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@veyrith/core";
import { hashPassword } from "@veyrith/core/password";
import { createVerificationToken, discardVerificationToken, sendVerificationEmail } from "@veyrith/core/email-verification";

const registration = z.object({
  email: z.string().email().max(254),
  name: z.string().trim().min(1).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  password: z.string().min(14).max(200),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const parsed = registration.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide a valid email, name, Indian mobile number, and password of at least 14 characters." }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("Customer")
    .select("id,email,name,emailVerifiedAt")
    .eq("email", email)
    .maybeSingle();
  if (existingError) throw new Error(`Could not check existing customer: ${existingError.message}`);
  if (existing) {
    if (!existing.emailVerifiedAt) {
      const token = await createVerificationToken(existing.id);
      if (token) {
        try {
          await sendVerificationEmail({ email: existing.email, name: existing.name, token });
        } catch (error) {
          await discardVerificationToken(token);
          console.error("Customer verification email could not be sent.", error);
          return NextResponse.json({ error: "Verification email delivery failed. Please try the resend option." }, { status: 503 });
        }
      }
    }
    return NextResponse.json({ verificationSent: true }, { status: 202 });
  }
  const { data: customer, error: createError } = await supabase
    .from("Customer")
    .insert({
      id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      email,
      name: parsed.data.name,
      phone: parsed.data.phone,
      passwordHash: await hashPassword(parsed.data.password),
    })
    .select("id,email,name")
    .single();
  if (createError) {
    if (createError.code === "23505") return NextResponse.json({ verificationSent: true }, { status: 202 });
    throw new Error(`Could not create customer account: ${createError.message}`);
  }
  const token = await createVerificationToken(customer.id);
  if (!token) return NextResponse.json({ verificationSent: true }, { status: 202 });
  try {
    await sendVerificationEmail({ email: customer.email, name: customer.name, token });
  } catch (error) {
    await discardVerificationToken(token);
    console.error("Customer verification email could not be sent.", error);
    return NextResponse.json(
      { error: "Your account was created but verification email delivery failed. Please use the resend verification option." },
      { status: 503 },
    );
  }
  return NextResponse.json({ verificationSent: true }, { status: 202 });
}
