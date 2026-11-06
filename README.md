# Veyrith Labs

Veyrith Labs is a Next.js monorepo with a public product/research site, a separate administrator CMS, and shared server-side commerce code. It uses Supabase's Data API and Storage, Razorpay, and PayU India. Content and products start empty; the only initial account is the administrator created with the one-time bootstrap command.

## Local development

Requirements: Node.js 20.9 or newer and npm.

1. Run `npm run env:init` to create `.env` from `.env.example` if it does not exist. This command never overwrites an existing `.env`. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SESSION_SECRET`, `PUBLIC_SITE_URL`, and `ADMIN_CMS_URL`. The public Supabase URL and publishable key are only needed by the browser-side Supabase helper. Do not use `cp .env.example .env` after configuring `.env`, since that overwrites your local settings.
2. Install dependencies:

   ```sh
   npm ci
   ```

3. Apply [`supabase/migrations/20261106200000_initial.sql`](./supabase/migrations/20261106200000_initial.sql) and [`supabase/storage.sql`](./supabase/storage.sql) in the Supabase SQL editor.
4. Start the two applications in separate terminals:

   ```sh
   npm run dev:public
   npm run dev:admin
   ```

   The public site runs on `http://localhost:3000`; the CMS runs on `http://localhost:3001`.
5. Create the first CMS administrator once:

   ```sh
   npm run admin:bootstrap
   ```

   Set `BOOTSTRAP_ADMIN_EMAIL` and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 14 characters only for this command, then remove them. Bootstrap refuses to run once any administrator exists.

Customer registration requires a working SMTP configuration so email verification links can be delivered. Payment credentials are optional for development, but checkout requires the corresponding provider to be configured.

The server-side application uses Supabase's Data API and does not connect directly to PostgreSQL. Keep the service-role key server-only. The public app's optional Supabase SSR middleware refreshes Supabase Auth sessions; it does not replace the app's custom customer or separate CMS administrator sessions. For local development, the Next.js apps load the shared root `.env`; an app-specific `.env.local` may also be used for Supabase's public URL and publishable key.

## Checks

```sh
npm test
npm run build
npx tsc --noEmit -p apps/public/tsconfig.json
npx tsc --noEmit -p apps/admin/tsconfig.json
```

See [deployment and provider setup](./docs/deployment.md) for production configuration, schema setup, storage, payment callbacks, and SEO verification.
