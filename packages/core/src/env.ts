import { z } from "zod";

const serverEnvSchema = z.object({
  AUTH_SESSION_SECRET: z.string().min(32),
  PUBLIC_SITE_URL: z.string().url(),
  ADMIN_CMS_URL: z.string().url(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  PAYU_MERCHANT_KEY: z.string().optional(),
  PAYU_MERCHANT_SALT: z.string().optional(),
  PAYU_MODE: z.enum(["test", "production"]).default("test"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(3).optional(),
  ),
});

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}

export function getPublicSiteUrl() {
  const configured = process.env.PUBLIC_SITE_URL ?? "https://veyrithlabs.com";
  return z.string().url().parse(configured).replace(/\/$/, "");
}
