# Deployment and operations

## Required configuration

Use separate deployment projects/origins for the public site and CMS. Set the same Supabase and session-secret configuration in both server environments:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service role key used by the Data API and Storage.
- `AUTH_SESSION_SECRET`: a high-entropy secret of at least 32 characters.
- `PUBLIC_SITE_URL`: canonical HTTPS origin of the public app.
- `ADMIN_CMS_URL`: HTTPS origin of the CMS.

Keep all variables server-side unless explicitly named `NEXT_PUBLIC_*`. Never expose the Supabase service-role key, SMTP password, payment secrets, or PayU salt in client code. Use the private installer and media buckets; do not make `product-installers` public.

Customer registration and account verification need `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, and, when required by the mail provider, `SMTP_USER` and `SMTP_PASSWORD`. Verification links expire after 30 minutes. Test delivery and link routing from the deployed public origin.

## Database and storage

1. Create a Supabase project and configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on both applications. Application data access uses Supabase's Data API; it does not connect directly to PostgreSQL.
2. Apply [`../supabase/migrations/20261106200000_initial.sql`](../supabase/migrations/20261106200000_initial.sql) in the Supabase SQL editor before deploying. It creates the application tables, row-level security policies, and server-side RPCs used for payment/refund transactions. The service-role key is required for server operations and must remain private.

   ```sh
   npm ci
   ```

3. Execute [`../supabase/storage.sql`](../supabase/storage.sql) in the Supabase SQL editor to create the private `product-installers` and `public-media` buckets. The application uses server-side storage access and short-lived signed URLs.

No products, articles, pages, customers, orders, or administrator accounts are seeded. To create the initial administrator, set `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` temporarily and run `npm run admin:bootstrap` once. Remove both variables immediately afterward. The command refuses to create an administrator if one already exists.

## Deploy the applications

Create two deployment projects from the same repository root. Install dependencies from the monorepo root and build the app-specific workspace:

| App | Build command | Start command |
|---|---|---|
| Public | `npm run build --workspace @veyrith/public` | `npm run start --workspace @veyrith/public` |
| Admin | `npm run build --workspace @veyrith/admin` | `npm run start --workspace @veyrith/admin` |

Set the environment variables for both projects. Configure `PUBLIC_SITE_URL` and `ADMIN_CMS_URL` with their final HTTPS origins before enabling checkout. The CMS uses separate, HTTP-only administrator cookies; do not proxy or merge the CMS into the public application's origin unless that deployment is deliberately reconfigured and reviewed.

## Payment provider setup

### Razorpay

- Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in the public app's server environment.
- Configure the Razorpay webhook endpoint as `https://<public-origin>/api/payments/razorpay/webhook` and use the exact webhook secret configured in the app.
- Enable at least `payment.captured`, `payment.failed`, `refund.processed`, and `refund.failed`.
- Test checkout, delayed webhook delivery, duplicate webhooks, and refund status reconciliation with Razorpay test credentials before enabling live credentials.

### PayU India

- Start with `PAYU_MODE=test`; set `PAYU_MERCHANT_KEY` and `PAYU_MERCHANT_SALT` on the public app only.
- The app submits hosted checkouts to PayU test or production endpoints. Configure the merchant's allowed/registered return origins to match `PUBLIC_SITE_URL`.
- Success and failure return to `https://<public-origin>/api/payments/payu/callback`. The callback hash is checked, then the app calls PayU `verify_payment` before granting an entitlement.
- Refund initiation and status lookup use PayU's server-side post-service API. Reconcile pending refunds from the CMS; do not retry an uncertain provider request until its status is checked.
- Verify checkout hashes, successful/failed/pending callbacks, payment verification, refunds, and refund status using merchant test credentials. Do not set `PAYU_MODE=production` until these flows have been confirmed against the merchant account.

Provider credentials and merchant accounts are not included in this repository. A successful build does not verify provider callbacks, refunds, Supabase connectivity, or live payment readiness.

## Content, downloads, and SEO

Add products and publish public content through the CMS after creating the administrator. Installer uploads remain private; the public app only issues short-lived download URLs after checking a customer's verified account entitlement.

After launch, verify `https://<public-origin>/sitemap.xml` and `https://<public-origin>/robots.txt`, then submit the sitemap in Google Search Console and any other webmaster tools used by the business. Keep draft and unpublished content out of sitemap submissions.
