import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@veyrith/core";
import { readSessionToken } from "@veyrith/core/session";
import { InquiryList } from "./inquiry-list";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const token = (await cookies()).get("veyrith_admin")?.value;
  const session = token ? await readSessionToken(token, "administrator") : null;
  if (!session) redirect("/login");
  const { data: administrator, error: adminError } = await getSupabaseAdmin()
    .from("Administrator").select("id").eq("id", session.sub).eq("isActive", true).maybeSingle();
  if (adminError) throw new Error(`Could not verify administrator session: ${adminError.message}`);
  if (!administrator) redirect("/login");
  const { data: inquiries, error } = await getSupabaseAdmin().from("Inquiry").select("*").order("createdAt", { ascending: false });
  if (error) throw new Error(`Could not load inquiries: ${error.message}`);
  return (
    <>
      <header><a href="/">Veyrith Labs CMS</a><nav><a href="/">Dashboard</a><a href="/content">Pages and research</a></nav></header>
      <main>
        <h1>Customer inquiries</h1>
        {inquiries.length === 0 ? <section className="panel"><p>No customer inquiries yet.</p></section> : <InquiryList inquiries={inquiries} />}
      </main>
    </>
  );
}
