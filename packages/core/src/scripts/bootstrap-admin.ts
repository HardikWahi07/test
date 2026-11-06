import { randomUUID } from "node:crypto";
import "dotenv/config";
import { hashPassword } from "../password";
import { getSupabaseAdmin } from "../supabase";

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 14) {
    throw new Error(
      "Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 14 characters for this one-time command.",
    );
  }
  const supabase = getSupabaseAdmin();
  const { count, error: countError } = await supabase
    .from("Administrator")
    .select("id", { count: "exact", head: true });
  if (countError) throw new Error(`Could not check existing administrators: ${countError.message}`);
  if (count !== 0) {
    throw new Error("Administrator bootstrap is disabled because an administrator already exists.");
  }
  const { error } = await supabase.from("Administrator").insert({
    id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
    email,
    passwordHash: await hashPassword(password),
  });
  if (error) throw new Error(`Could not create administrator: ${error.message}`);
  console.log(`Administrator created for ${email}. Remove bootstrap credentials from the environment.`);
}

main()
  .catch((error: unknown) => {
    console.error("Administrator bootstrap failed:", error);
    process.exitCode = 1;
  })
