import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin, writeAuditLog } from "@veyrith/core";
import { getAdministratorId } from "@veyrith/core/admin-session";

const update = z.object({ handled: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const administratorId = await getAdministratorId(request);
  if (!administratorId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const parsed = update.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid inquiry update" }, { status: 400 });
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: inquiry, error } = await supabase
    .from("Inquiry")
    .update({ handledAt: parsed.data.handled ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Could not update inquiry: ${error.message}`);
  if (!inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  await writeAuditLog({ administratorId, action: "inquiry.updated", entityType: "Inquiry", entityId: id });
  return NextResponse.json(inquiry);
}
