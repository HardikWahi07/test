import { VerifyEmailButton } from "./verify-email-button";

export const metadata = { robots: { index: false, follow: false } };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <main>
      <section className="hero">
        <span className="eyebrow">Account verification</span>
        <h1>Verify your email</h1>
        <p>Confirm your email address to activate customer account access.</p>
        {token ? <VerifyEmailButton token={token} /> : <p className="error">This verification link is missing its token.</p>}
      </section>
    </main>
  );
}
