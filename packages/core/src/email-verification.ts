import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { getServerEnv, getPublicSiteUrl } from "./env";
import { getSupabaseAdmin } from "./supabase";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const TOKEN_RESEND_COOLDOWN_MS = 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createVerificationToken(customerId: string) {
  const token = randomBytes(32).toString("base64url");
  const { data, error } = await getSupabaseAdmin().rpc("create_customer_verification_token", {
    p_customer_id: customerId,
    p_token_hash: hashToken(token),
    p_expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    p_cooldown_since: new Date(Date.now() - TOKEN_RESEND_COOLDOWN_MS).toISOString(),
  });
  if (error) throw new Error(`Could not create email verification token: ${error.message}`);
  return data ? token : null;
}

export async function discardVerificationToken(token: string) {
  const { error } = await getSupabaseAdmin()
    .from("CustomerVerificationToken")
    .delete()
    .eq("tokenHash", hashToken(token));
  if (error) throw new Error(`Could not discard email verification token: ${error.message}`);
}

export async function sendVerificationEmail(input: { email: string; name: string | null; token: string }) {
  const env = getServerEnv();
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    throw new Error("SMTP_HOST and SMTP_FROM must be configured to send verification emails");
  }
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASSWORD
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
  });
  const verificationUrl = `${getPublicSiteUrl()}/verify-email?token=${encodeURIComponent(input.token)}`;
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: input.email,
    subject: "Verify your Veyrith Labs account",
    text: `Hello ${input.name ?? "there"},\n\nVerify your email address by visiting this link within 30 minutes:\n${verificationUrl}\n\nIf you did not create an account, you can ignore this email.`,
  });
}

export async function verifyCustomerEmail(token: string) {
  const tokenHash = hashToken(token);
  const { data, error } = await getSupabaseAdmin().rpc("verify_customer_email", {
    p_token_hash: tokenHash,
  });
  if (error) throw new Error(`Could not verify customer email: ${error.message}`);
  return typeof data === "string" ? { id: data } : null;
}
