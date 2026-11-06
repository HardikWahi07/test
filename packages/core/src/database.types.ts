type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type Timestamp = string;
type Table<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
type IdRow = { id: string };
type Timestamped = { createdAt: Timestamp; updatedAt: Timestamp };

export type Database = {
  public: {
    Tables: {
      Administrator: Table<IdRow & Timestamped & { email: string; passwordHash: string; name: string | null; isActive: boolean }>;
      Customer: Table<IdRow & Timestamped & { email: string; emailVerifiedAt: Timestamp | null; name: string | null; phone: string | null; passwordHash: string | null }>;
      CustomerVerificationToken: Table<IdRow & { customerId: string; tokenHash: string; expiresAt: Timestamp; createdAt: Timestamp }>;
      ProductCategory: Table<IdRow & Timestamped & { name: string; slug: string }>;
      Product: Table<IdRow & Timestamped & {
        name: string; slug: string; shortDescription: string; description: string; categoryId: string;
        priceMinor: number; currency: string; status: string; isPublished: boolean; publishedAt: Timestamp | null;
        releaseVersion: string | null; releaseNotes: string | null; systemRequirements: string | null;
        documentationUrl: string | null; supportInformation: string | null; seoTitle: string | null;
        seoDescription: string | null; canonicalUrl: string | null; logoMediaAssetId: string | null;
        openGraphImageId: string | null; features: string[]; archivedAt: Timestamp | null;
      }>;
      ProductImage: Table<IdRow & { productId: string; mediaAssetId: string; altText: string; sortOrder: number; createdAt: Timestamp }>;
      ProductVersion: Table<IdRow & { productId: string; version: string; releaseNotes: string | null; isPublished: boolean; releasedAt: Timestamp | null; createdAt: Timestamp }>;
      ProductInstaller: Table<IdRow & Timestamped & {
        versionId: string; platform: "MACOS" | "WINDOWS"; fileName: string; storagePath: string; fileSize: number;
        mimeType: string; minimumOsVersion: string | null; isPublished: boolean;
      }>;
      Order: Table<IdRow & Timestamped & {
        customerId: string; status: string; amountMinor: number; currency: string; provider: string;
        providerOrderId: string | null; idempotencyKey: string;
      }>;
      OrderItem: Table<IdRow & {
        orderId: string; productId: string; productName: string; unitAmountMinor: number;
        quantity: number; platform: string | null;
      }>;
      Payment: Table<IdRow & Timestamped & {
        orderId: string; provider: string; providerPaymentId: string | null; status: string;
        amountMinor: number; currency: string; failureCode: string | null;
        failureMessage: string | null; verifiedAt: Timestamp | null;
      }>;
      PaymentWebhookEvent: Table<IdRow & {
        provider: string; providerEventId: string; status: string; payload: Json;
        failureReason: string | null; receivedAt: Timestamp; processedAt: Timestamp | null;
      }>;
      Entitlement: Table<IdRow & {
        customerId: string; productId: string; orderId: string; status: string;
        licenceTerms: string | null; grantedAt: Timestamp; revokedAt: Timestamp | null; updatedAt: Timestamp;
      }>;
      DownloadEvent: Table<IdRow & {
        customerId: string; productId: string; versionId: string; installerId: string; createdAt: Timestamp;
      }>;
      Refund: Table<IdRow & Timestamped & {
        orderId: string; paymentId: string; providerRefundId: string | null; providerRequestId: string | null;
        idempotencyToken: string; amountMinor: number; status: string; reason: string | null; entitlementRevoked: boolean;
      }>;
      Page: Table<IdRow & Timestamped & {
        title: string; slug: string; content: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED"; seoTitle: string | null;
        seoDescription: string | null; canonicalUrl: string | null; openGraphImageId: string | null;
        robotsIndex: boolean; publishedAt: Timestamp | null;
      }>;
      BlogCategory: Table<IdRow & { name: string; slug: string; createdAt: Timestamp }>;
      BlogTag: Table<{ id: string; name: string; slug: string }>;
      BlogPost: Table<IdRow & Timestamped & {
        title: string; slug: string; excerpt: string | null; content: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        categoryId: string | null; seoTitle: string | null; seoDescription: string | null;
        canonicalUrl: string | null; openGraphImageId: string | null; robotsIndex: boolean; publishedAt: Timestamp | null;
      }>;
      MediaAsset: Table<IdRow & {
        storagePath: string; fileName: string; mimeType: string; fileSize: number;
        altText: string | null; createdAt: Timestamp;
      }>;
      Inquiry: Table<IdRow & { name: string; email: string; subject: string | null; message: string; createdAt: Timestamp; handledAt: Timestamp | null }>;
      AuditLog: Table<IdRow & {
        administratorId: string | null; action: string; entityType: string; entityId: string | null;
        details: Json | null; createdAt: Timestamp;
      }>;
      SiteSetting: Table<{ key: string; value: Json; updatedAt: Timestamp }>;
      _BlogPostToBlogTag: Table<{ A: string; B: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      create_customer_order: {
        Args: { p_customer_id: string; p_product_slug: string; p_platform: "MACOS" | "WINDOWS"; p_provider: "RAZORPAY" | "PAYU" };
        Returns: Json;
      };
      create_customer_verification_token: {
        Args: { p_customer_id: string; p_token_hash: string; p_expires_at: string; p_cooldown_since: string };
        Returns: boolean;
      };
      grant_order_entitlements: {
        Args: {
          p_order_id: string; p_provider: "RAZORPAY" | "PAYU"; p_provider_payment_id: string;
          p_amount_minor: number; p_currency: string; p_event_id?: string | null; p_payload?: Json;
        };
        Returns: Json;
      };
      process_failed_payment: {
        Args: { p_order_id: string; p_failure_message: string; p_provider_payment_id?: string | null };
        Returns: undefined;
      };
      process_failed_payment_webhook: {
        Args: {
          p_provider: "RAZORPAY" | "PAYU"; p_event_id: string; p_order_id: string;
          p_payment_id: string; p_payload: Json; p_failure_code?: string | null; p_failure_message?: string | null;
        };
        Returns: undefined;
      };
      process_refund_result: {
        Args: { p_refund_id: string; p_status: "PENDING" | "PROCESSED" | "FAILED"; p_provider_refund_id?: string | null; p_provider_request_id?: string | null };
        Returns: Json;
      };
      process_refund_webhook: {
        Args: { p_provider: "RAZORPAY" | "PAYU"; p_event_id: string; p_payload: Json; p_refund_id: string; p_status: "PENDING" | "PROCESSED" | "FAILED"; p_provider_refund_id?: string | null };
        Returns: Json;
      };
      reserve_customer_refund: {
        Args: {
          p_order_id: string; p_administrator_id: string; p_amount_minor: number; p_reason: string;
          p_revoke_entitlement: boolean; p_idempotency_token: string;
        };
        Returns: Json;
      };
      verify_customer_email: { Args: { p_token_hash: string }; Returns: string | null };
    };
    Enums: {
      ProductStatus: "DRAFT" | "COMING_SOON" | "BETA" | "AVAILABLE" | "DISCONTINUED" | "ARCHIVED";
      Platform: "MACOS" | "WINDOWS";
      OrderStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";
      PaymentProvider: "RAZORPAY" | "PAYU";
      PaymentStatus: "CREATED" | "PENDING" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";
      EntitlementStatus: "ACTIVE" | "REVOKED" | "REFUNDED";
      RefundStatus: "PENDING" | "PROCESSED" | "FAILED";
      PublicationStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      WebhookStatus: "RECEIVED" | "PROCESSED" | "FAILED";
    };
    CompositeTypes: Record<string, never>;
  };
};
