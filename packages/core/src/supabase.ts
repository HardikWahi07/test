import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let client: SupabaseClient<Database> | undefined;
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export function getSupabaseAdmin() {
  if (client) return client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and server-only SUPABASE_SERVICE_ROLE_KEY must be configured.");
  }
  client = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export const PaymentProvider = {
  RAZORPAY: "RAZORPAY",
  PAYU: "PAYU",
} as const;
export type PaymentProvider = (typeof PaymentProvider)[keyof typeof PaymentProvider];

export const PaymentStatus = {
  CREATED: "CREATED",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export const OrderStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export const PublicationStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;

export const Platform = {
  MACOS: "MACOS",
  WINDOWS: "WINDOWS",
} as const;

export type ProductInstaller = {
  id: string;
  versionId: string;
  platform: "MACOS" | "WINDOWS";
  fileName: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  minimumOsVersion: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export function isUniqueViolation(error: { code?: string } | null | undefined) {
  return error?.code === "23505";
}

export function isMissingRow(error: { code?: string } | null | undefined) {
  return error?.code === "PGRST116";
}

export async function writeAuditLog(input: {
  administratorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: { [key: string]: Json | undefined };
}) {
  const { error } = await getSupabaseAdmin().from("AuditLog").insert({
    id: `c${randomUUID().replaceAll("-", "").slice(0, 24)}`,
    administratorId: input.administratorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    details: input.details ?? null,
  });
  if (error) throw new Error(`Could not write audit log: ${error.message}`);
}
