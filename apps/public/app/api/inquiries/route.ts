import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@veyrith/core";

const inquiryInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(254),
  subject: z.string().trim().max(180).optional(),
  message: z.string().trim().min(1).max(10_000),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = inquiryInput.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid name, email, and message." }, { status: 400 });
  const { error } = await getSupabaseAdmin().from("Inquiry").insert({
      id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
      name: parsed.data.name,
      email: parsed.data.email.trim().toLowerCase(),
      subject: parsed.data.subject,
      message: parsed.data.message,
  });
  if (error) throw new Error(`Could not save inquiry: ${error.message}`);
  return NextResponse.json({ received: true }, { status: 201 });
}
