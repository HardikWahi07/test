import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { readSessionToken } from "@veyrith/core/session";
import { getSupabaseAdmin } from "@veyrith/core";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const token = (await cookies()).get("veyrith_admin")?.value;
  const session = token ? await readSessionToken(token, "administrator") : null;
  if (session) {
    const { data, error: lookupError } = await getSupabaseAdmin()
      .from("Administrator")
      .select("id")
      .eq("id", session.sub)
      .eq("isActive", true)
      .maybeSingle();
    if (lookupError) throw new Error(`Could not verify administrator session: ${lookupError.message}`);
    if (data) redirect("/");
  }
  const { error } = await searchParams;

  return (
    <main style={{ maxWidth: 440 }}>
      <section className="panel">
        <h1>Administrator sign in</h1>
        <p>Access is restricted to authorized Veyrith Labs administrators.</p>
        {error && <p className="error" role="alert">Sign-in failed. Check your credentials and try again.</p>}
        <form action="/api/auth/admin/login" method="post">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">Sign in</button>
        </form>
      </section>
    </main>
  );
}
