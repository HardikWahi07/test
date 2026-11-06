-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'COMING_SOON', 'BETA', 'AVAILABLE', 'DISCONTINUED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('MACOS', 'WINDOWS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY', 'PAYU');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'REVOKED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "Administrator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "name" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerVerificationToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "releaseVersion" TEXT,
    "releaseNotes" TEXT,
    "systemRequirements" TEXT,
    "documentationUrl" TEXT,
    "supportInformation" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "logoMediaAssetId" TEXT,
    "openGraphImageId" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVersion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "releaseNotes" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInstaller" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "minimumOsVersion" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInstaller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "amountMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "provider" "PaymentProvider" NOT NULL,
    "providerOrderId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitAmountMinor" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "platform" "Platform",

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerPaymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amountMinor" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "failureReason" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "licenceTerms" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownloadEvent" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "installerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DownloadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "providerRefundId" TEXT,
    "providerRequestId" TEXT,
    "idempotencyToken" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "entitlementRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "openGraphImageId" TEXT,
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "BlogTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "categoryId" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "canonicalUrl" TEXT,
    "openGraphImageId" TEXT,
    "robotsIndex" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "altText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handledAt" TIMESTAMP(3),

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "administratorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_BlogPostToBlogTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BlogPostToBlogTag_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Administrator', 'Customer', 'ProductCategory', 'Product', 'ProductInstaller',
    'Order', 'Payment', 'Entitlement', 'Refund', 'Page', 'BlogPost', 'SiteSetting'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      table_name
    );
  END LOOP;
END;
$$;

-- CreateIndex
CREATE UNIQUE INDEX "Administrator_email_key" ON "Administrator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerVerificationToken_tokenHash_key" ON "CustomerVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerVerificationToken_customerId_expiresAt_idx" ON "CustomerVerificationToken"("customerId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_isPublished_status_publishedAt_idx" ON "Product"("isPublished", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductVersion_productId_isPublished_idx" ON "ProductVersion"("productId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVersion_productId_version_key" ON "ProductVersion"("productId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInstaller_storagePath_key" ON "ProductInstaller"("storagePath");

-- CreateIndex
CREATE INDEX "ProductInstaller_platform_isPublished_idx" ON "ProductInstaller"("platform", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInstaller_versionId_platform_key" ON "ProductInstaller"("versionId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Order_providerOrderId_key" ON "Order"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_provider_status_receivedAt_idx" ON "PaymentWebhookEvent"("provider", "status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_provider_providerEventId_key" ON "PaymentWebhookEvent"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "Entitlement_orderId_idx" ON "Entitlement"("orderId");

-- CreateIndex
CREATE INDEX "Entitlement_customerId_status_idx" ON "Entitlement"("customerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_customerId_productId_key" ON "Entitlement"("customerId", "productId");

-- CreateIndex
CREATE INDEX "DownloadEvent_productId_createdAt_idx" ON "DownloadEvent"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "DownloadEvent_customerId_createdAt_idx" ON "DownloadEvent"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRefundId_key" ON "Refund"("providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerRequestId_key" ON "Refund"("providerRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyToken_key" ON "Refund"("idempotencyToken");

-- CreateIndex
CREATE INDEX "Refund_orderId_status_idx" ON "Refund"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_status_publishedAt_idx" ON "Page"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_name_key" ON "BlogCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_name_key" ON "BlogTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BlogTag_slug_key" ON "BlogTag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_status_publishedAt_idx" ON "BlogPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_categoryId_idx" ON "BlogPost"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storagePath_key" ON "MediaAsset"("storagePath");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_administratorId_createdAt_idx" ON "AuditLog"("administratorId", "createdAt");

-- CreateIndex
CREATE INDEX "_BlogPostToBlogTag_B_index" ON "_BlogPostToBlogTag"("B");

-- AddForeignKey
ALTER TABLE "CustomerVerificationToken" ADD CONSTRAINT "CustomerVerificationToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_logoMediaAssetId_fkey" FOREIGN KEY ("logoMediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_openGraphImageId_fkey" FOREIGN KEY ("openGraphImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVersion" ADD CONSTRAINT "ProductVersion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInstaller" ADD CONSTRAINT "ProductInstaller_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProductVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadEvent" ADD CONSTRAINT "DownloadEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadEvent" ADD CONSTRAINT "DownloadEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadEvent" ADD CONSTRAINT "DownloadEvent_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProductVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DownloadEvent" ADD CONSTRAINT "DownloadEvent_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "ProductInstaller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_openGraphImageId_fkey" FOREIGN KEY ("openGraphImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_openGraphImageId_fkey" FOREIGN KEY ("openGraphImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "Administrator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogPostToBlogTag" ADD CONSTRAINT "_BlogPostToBlogTag_A_fkey" FOREIGN KEY ("A") REFERENCES "BlogPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogPostToBlogTag" ADD CONSTRAINT "_BlogPostToBlogTag_B_fkey" FOREIGN KEY ("B") REFERENCES "BlogTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Administrator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomerVerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductInstaller" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentWebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Entitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DownloadEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Page" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlogCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlogTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BlogPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MediaAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Inquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_BlogPostToBlogTag" ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO service_role;
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'Administrator', 'Customer', 'CustomerVerificationToken', 'ProductCategory',
    'Product', 'ProductImage', 'ProductVersion', 'ProductInstaller', 'Order',
    'OrderItem', 'Payment', 'PaymentWebhookEvent', 'Entitlement', 'DownloadEvent',
    'Refund', 'Page', 'BlogCategory', 'BlogTag', 'BlogPost', 'MediaAsset',
    'Inquiry', 'AuditLog', 'SiteSetting', '_BlogPostToBlogTag'
  ] LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I FROM PUBLIC, anon, authenticated', table_name);
    EXECUTE format('GRANT ALL PRIVILEGES ON TABLE %I TO service_role', table_name);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION create_customer_verification_token(
  p_customer_id TEXT,
  p_token_hash TEXT,
  p_expires_at TIMESTAMP,
  p_cooldown_since TIMESTAMP
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_customer_id));
  IF EXISTS (
    SELECT 1 FROM "CustomerVerificationToken"
    WHERE "customerId" = p_customer_id AND "createdAt" > p_cooldown_since
  ) THEN
    RETURN FALSE;
  END IF;
  DELETE FROM "CustomerVerificationToken" WHERE "customerId" = p_customer_id;
  INSERT INTO "CustomerVerificationToken" ("id", "customerId", "tokenHash", "expiresAt", "createdAt")
  VALUES (
    'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
    p_customer_id,
    p_token_hash,
    p_expires_at,
    now()
  );
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION verify_customer_email(p_token_hash TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id TEXT;
BEGIN
  SELECT "customerId" INTO v_customer_id
  FROM "CustomerVerificationToken"
  WHERE "tokenHash" = p_token_hash AND "expiresAt" > now()
  FOR UPDATE;
  IF v_customer_id IS NULL THEN
    DELETE FROM "CustomerVerificationToken" WHERE "tokenHash" = p_token_hash;
    RETURN NULL;
  END IF;
  DELETE FROM "CustomerVerificationToken" WHERE "tokenHash" = p_token_hash;
  UPDATE "Customer"
  SET "emailVerifiedAt" = COALESCE("emailVerifiedAt", now()), "updatedAt" = now()
  WHERE "id" = v_customer_id;
  RETURN v_customer_id;
END;
$$;

REVOKE ALL ON FUNCTION create_customer_verification_token(TEXT, TEXT, TIMESTAMP, TIMESTAMP) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_customer_verification_token(TEXT, TEXT, TIMESTAMP, TIMESTAMP) TO service_role;
REVOKE ALL ON FUNCTION verify_customer_email(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_customer_email(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION grant_order_entitlements(
  p_order_id TEXT,
  p_provider "PaymentProvider",
  p_provider_payment_id TEXT,
  p_amount_minor INTEGER,
  p_currency VARCHAR,
  p_event_id TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_order "Order"%ROWTYPE;
  v_event_id TEXT;
  v_event "PaymentWebhookEvent"%ROWTYPE;
  v_item "OrderItem"%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_order_id));
  IF p_event_id IS NOT NULL THEN
    INSERT INTO "PaymentWebhookEvent" ("id", "provider", "providerEventId", "payload")
    VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), p_provider, p_event_id, p_payload)
    ON CONFLICT ("provider", "providerEventId") DO NOTHING;
    SELECT * INTO v_event FROM "PaymentWebhookEvent"
    WHERE "provider" = p_provider AND "providerEventId" = p_event_id FOR UPDATE;
    IF v_event."status" = 'PROCESSED' THEN
      SELECT * INTO v_order FROM "Order" WHERE "id" = p_order_id;
      RETURN to_jsonb(v_order);
    END IF;
    v_event_id := v_event."id";
  END IF;
  SELECT * INTO v_order FROM "Order" WHERE "id" = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment order was not found'; END IF;
  IF v_order."provider" <> p_provider OR v_order."amountMinor" <> p_amount_minor OR v_order."currency" <> p_currency THEN
    RAISE EXCEPTION 'Verified payment does not match stored order';
  END IF;
  UPDATE "Payment" SET
    "providerPaymentId" = p_provider_payment_id, "status" = 'CAPTURED',
    "amountMinor" = p_amount_minor, "currency" = p_currency,
    "verifiedAt" = now(), "updatedAt" = now()
  WHERE "orderId" = p_order_id AND "provider" = p_provider AND "providerPaymentId" IS NULL;
  IF NOT FOUND THEN
    INSERT INTO "Payment" ("id", "orderId", "provider", "providerPaymentId", "status", "amountMinor", "currency", "verifiedAt", "createdAt", "updatedAt")
    VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), p_order_id, p_provider, p_provider_payment_id, 'CAPTURED', p_amount_minor, p_currency, now(), now(), now())
    ON CONFLICT ("provider", "providerPaymentId") DO UPDATE SET
      "status" = 'CAPTURED', "amountMinor" = EXCLUDED."amountMinor", "currency" = EXCLUDED."currency",
      "verifiedAt" = now(), "updatedAt" = now();
  END IF;
  UPDATE "Order" SET "status" = 'PAID', "updatedAt" = now() WHERE "id" = p_order_id;
  FOR v_item IN SELECT * FROM "OrderItem" WHERE "orderId" = p_order_id LOOP
    INSERT INTO "Entitlement" ("id", "customerId", "productId", "orderId", "status", "grantedAt", "updatedAt")
    VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), v_order."customerId", v_item."productId", p_order_id, 'ACTIVE', now(), now())
    ON CONFLICT ("customerId", "productId") DO NOTHING;
  END LOOP;
  IF v_event_id IS NOT NULL THEN
    UPDATE "PaymentWebhookEvent" SET "status" = 'PROCESSED', "processedAt" = now() WHERE "id" = v_event_id;
  END IF;
  SELECT * INTO v_order FROM "Order" WHERE "id" = p_order_id;
  RETURN to_jsonb(v_order);
END;
$$;

CREATE OR REPLACE FUNCTION process_failed_payment(
  p_order_id TEXT,
  p_failure_message TEXT,
  p_provider_payment_id TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE "Order" SET "status" = 'FAILED', "updatedAt" = now()
  WHERE "id" = p_order_id AND "status" <> 'PAID';
  UPDATE "Payment" SET "status" = 'FAILED', "providerPaymentId" = p_provider_payment_id,
    "failureMessage" = left(p_failure_message, 500), "updatedAt" = now()
  WHERE "orderId" = p_order_id AND "status" IN ('CREATED', 'PENDING', 'AUTHORIZED');
END;
$$;

CREATE OR REPLACE FUNCTION process_failed_payment_webhook(
  p_provider "PaymentProvider",
  p_event_id TEXT,
  p_order_id TEXT,
  p_payment_id TEXT,
  p_payload JSONB,
  p_failure_code TEXT DEFAULT NULL,
  p_failure_message TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_event "PaymentWebhookEvent"%ROWTYPE;
  v_order "Order"%ROWTYPE;
BEGIN
  INSERT INTO "PaymentWebhookEvent" ("id", "provider", "providerEventId", "payload")
  VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), p_provider, p_event_id, p_payload)
  ON CONFLICT ("provider", "providerEventId") DO NOTHING;
  SELECT * INTO v_event FROM "PaymentWebhookEvent" WHERE "provider" = p_provider AND "providerEventId" = p_event_id FOR UPDATE;
  IF v_event."status" = 'PROCESSED' THEN RETURN; END IF;
  SELECT * INTO v_order FROM "Order" WHERE "id" = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order."provider" <> p_provider THEN RAISE EXCEPTION 'Payment order was not found'; END IF;
  IF v_order."status" <> 'PAID' THEN
    UPDATE "Order" SET "status" = 'FAILED', "updatedAt" = now() WHERE "id" = p_order_id;
    UPDATE "Payment" SET "providerPaymentId" = p_payment_id, "status" = 'FAILED',
      "failureCode" = p_failure_code, "failureMessage" = left(p_failure_message, 500), "updatedAt" = now()
    WHERE "orderId" = p_order_id AND "provider" = p_provider;
  END IF;
  UPDATE "PaymentWebhookEvent" SET "status" = 'PROCESSED', "processedAt" = now() WHERE "id" = v_event."id";
END;
$$;

CREATE OR REPLACE FUNCTION process_refund_result(
  p_refund_id TEXT,
  p_status "RefundStatus",
  p_provider_refund_id TEXT DEFAULT NULL,
  p_provider_request_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_refund "Refund"%ROWTYPE;
  v_order "Order"%ROWTYPE;
  v_order_id TEXT;
  v_refunded BIGINT;
  v_full BOOLEAN;
BEGIN
  SELECT "orderId" INTO v_order_id FROM "Refund" WHERE "id" = p_refund_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Refund was not found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_order_id));
  SELECT * INTO v_refund FROM "Refund" WHERE "id" = p_refund_id FOR UPDATE;
  IF v_refund."status" = 'PENDING' THEN
    UPDATE "Refund" SET "status" = p_status, "providerRefundId" = COALESCE(p_provider_refund_id, "providerRefundId"),
      "providerRequestId" = COALESCE(p_provider_request_id, "providerRequestId"), "updatedAt" = now()
    WHERE "id" = p_refund_id RETURNING * INTO v_refund;
    IF p_status = 'PROCESSED' THEN
      IF v_refund."entitlementRevoked" THEN
        UPDATE "Entitlement" SET "status" = 'REFUNDED', "revokedAt" = now(), "updatedAt" = now()
        WHERE "orderId" = v_refund."orderId" AND "status" = 'ACTIVE';
      END IF;
      SELECT COALESCE(SUM("amountMinor"), 0) INTO v_refunded FROM "Refund"
        WHERE "orderId" = v_refund."orderId" AND "status" = 'PROCESSED';
      SELECT * INTO v_order FROM "Order" WHERE "id" = v_refund."orderId";
      v_full := v_refunded >= v_order."amountMinor";
      UPDATE "Order" SET "status" = CASE WHEN v_full THEN 'REFUNDED'::"OrderStatus" ELSE 'PARTIALLY_REFUNDED'::"OrderStatus" END,
        "updatedAt" = now() WHERE "id" = v_refund."orderId";
      UPDATE "Payment" SET "status" = CASE WHEN v_full THEN 'REFUNDED'::"PaymentStatus" ELSE 'PARTIALLY_REFUNDED'::"PaymentStatus" END,
        "updatedAt" = now() WHERE "id" = v_refund."paymentId";
    END IF;
  END IF;
  RETURN to_jsonb(v_refund);
END;
$$;

CREATE OR REPLACE FUNCTION process_refund_webhook(
  p_provider "PaymentProvider",
  p_event_id TEXT,
  p_payload JSONB,
  p_refund_id TEXT,
  p_status "RefundStatus",
  p_provider_refund_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_event "PaymentWebhookEvent"%ROWTYPE;
  v_refund JSONB;
BEGIN
  INSERT INTO "PaymentWebhookEvent" ("id", "provider", "providerEventId", "payload")
  VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), p_provider, p_event_id, p_payload)
  ON CONFLICT ("provider", "providerEventId") DO NOTHING;
  SELECT * INTO v_event FROM "PaymentWebhookEvent" WHERE "provider" = p_provider AND "providerEventId" = p_event_id FOR UPDATE;
  IF v_event."status" = 'PROCESSED' THEN RETURN NULL; END IF;
  v_refund := process_refund_result(p_refund_id, p_status, p_provider_refund_id, NULL);
  UPDATE "PaymentWebhookEvent" SET "status" = 'PROCESSED', "processedAt" = now() WHERE "id" = v_event."id";
  RETURN v_refund;
END;
$$;

REVOKE ALL ON FUNCTION grant_order_entitlements(TEXT, "PaymentProvider", TEXT, INTEGER, VARCHAR, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION grant_order_entitlements(TEXT, "PaymentProvider", TEXT, INTEGER, VARCHAR, TEXT, JSONB) TO service_role;
REVOKE ALL ON FUNCTION process_failed_payment(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION process_failed_payment(TEXT, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION process_failed_payment_webhook("PaymentProvider", TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION process_failed_payment_webhook("PaymentProvider", TEXT, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION process_refund_result(TEXT, "RefundStatus", TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION process_refund_result(TEXT, "RefundStatus", TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION process_refund_webhook("PaymentProvider", TEXT, JSONB, TEXT, "RefundStatus", TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION process_refund_webhook("PaymentProvider", TEXT, JSONB, TEXT, "RefundStatus", TEXT) TO service_role;

CREATE OR REPLACE FUNCTION create_customer_order(
  p_customer_id TEXT,
  p_product_slug TEXT,
  p_platform "Platform",
  p_provider "PaymentProvider"
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_product "Product"%ROWTYPE;
  v_order "Order"%ROWTYPE;
  v_entitlement "Entitlement"%ROWTYPE;
  v_id TEXT;
  v_pending_id TEXT;
BEGIN
  SELECT * INTO v_product FROM "Product"
  WHERE "slug" = p_product_slug AND "isPublished" = TRUE AND "status" IN ('AVAILABLE', 'BETA')
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product is not available for purchase'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(p_customer_id || ':' || v_product."id"));
  SELECT * INTO v_entitlement FROM "Entitlement"
  WHERE "customerId" = p_customer_id AND "productId" = v_product."id" AND "status" = 'ACTIVE';
  IF FOUND THEN RETURN jsonb_build_object('owned', TRUE, 'product', to_jsonb(v_product)); END IF;
  SELECT * INTO v_order FROM "Order"
  WHERE "customerId" = p_customer_id AND "status" = 'PENDING'
    AND EXISTS (SELECT 1 FROM "OrderItem" WHERE "orderId" = "Order"."id" AND "productId" = v_product."id")
  ORDER BY "createdAt" DESC LIMIT 1 FOR UPDATE;
  IF FOUND AND v_order."createdAt" > now() - interval '30 minutes' THEN
    RETURN jsonb_build_object('pending', TRUE, 'product', to_jsonb(v_product));
  ELSIF FOUND THEN
    v_pending_id := v_order."id";
    UPDATE "Order" SET "status" = 'CANCELLED', "updatedAt" = now() WHERE "id" = v_pending_id;
    UPDATE "Payment" SET "status" = 'CANCELLED', "updatedAt" = now()
      WHERE "orderId" = v_pending_id AND "status" IN ('CREATED', 'PENDING', 'AUTHORIZED');
  END IF;
  v_id := 'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24);
  INSERT INTO "Order" ("id", "customerId", "status", "amountMinor", "currency", "provider", "idempotencyKey", "createdAt", "updatedAt")
  VALUES (v_id, p_customer_id, 'PENDING', v_product."priceMinor", v_product."currency", p_provider, gen_random_uuid()::text, now(), now())
  RETURNING * INTO v_order;
  INSERT INTO "OrderItem" ("id", "orderId", "productId", "productName", "unitAmountMinor", "quantity", "platform")
  VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), v_id, v_product."id", v_product."name", v_product."priceMinor", 1, p_platform);
  INSERT INTO "Payment" ("id", "orderId", "provider", "status", "amountMinor", "currency", "createdAt", "updatedAt")
  VALUES ('c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24), v_id, p_provider, 'CREATED', v_product."priceMinor", v_product."currency", now(), now());
  RETURN jsonb_build_object('owned', FALSE, 'product', to_jsonb(v_product), 'order', to_jsonb(v_order));
END;
$$;
REVOKE ALL ON FUNCTION create_customer_order(TEXT, TEXT, "Platform", "PaymentProvider") FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_customer_order(TEXT, TEXT, "Platform", "PaymentProvider") TO service_role;

CREATE OR REPLACE FUNCTION reserve_customer_refund(
  p_order_id TEXT,
  p_administrator_id TEXT,
  p_amount_minor INTEGER,
  p_reason TEXT,
  p_revoke_entitlement BOOLEAN,
  p_idempotency_token TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_order "Order"%ROWTYPE;
  v_payment "Payment"%ROWTYPE;
  v_refund "Refund"%ROWTYPE;
  v_reserved BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_order_id));
  SELECT * INTO v_order FROM "Order" WHERE "id" = p_order_id FOR UPDATE;
  IF NOT FOUND OR v_order."status" NOT IN ('PAID', 'PARTIALLY_REFUNDED') THEN
    RETURN jsonb_build_object('error', 'Only paid orders can be refunded.');
  END IF;
  SELECT * INTO v_payment FROM "Payment" WHERE "orderId" = p_order_id
    AND "status" IN ('CAPTURED', 'PARTIALLY_REFUNDED') AND "providerPaymentId" IS NOT NULL
    ORDER BY "createdAt" DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'No captured provider payment is associated with this order.');
  END IF;
  SELECT COALESCE(SUM("amountMinor"), 0) INTO v_reserved FROM "Refund"
    WHERE "orderId" = p_order_id AND "status" IN ('PENDING', 'PROCESSED');
  IF p_amount_minor > v_order."amountMinor" - v_reserved THEN
    RETURN jsonb_build_object('error', 'Refund amount exceeds the remaining refundable balance.');
  END IF;
  INSERT INTO "Refund" (
    "id", "orderId", "paymentId", "idempotencyToken", "amountMinor", "status",
    "reason", "entitlementRevoked", "createdAt", "updatedAt"
  ) VALUES (
    'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
    p_order_id, v_payment."id", p_idempotency_token, p_amount_minor, 'PENDING',
    p_reason, p_revoke_entitlement, now(), now()
  ) RETURNING * INTO v_refund;
  INSERT INTO "AuditLog" ("id", "administratorId", "action", "entityType", "entityId", "details", "createdAt")
  VALUES (
    'c' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
    p_administrator_id, 'refund.initiated', 'Refund', v_refund."id",
    jsonb_build_object('provider', v_payment."provider", 'amountMinor', p_amount_minor), now()
  );
  RETURN jsonb_build_object('refund', to_jsonb(v_refund), 'order', to_jsonb(v_order), 'payment', to_jsonb(v_payment));
END;
$$;
REVOKE ALL ON FUNCTION reserve_customer_refund(TEXT, TEXT, INTEGER, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION reserve_customer_refund(TEXT, TEXT, INTEGER, TEXT, BOOLEAN, TEXT) TO service_role;
