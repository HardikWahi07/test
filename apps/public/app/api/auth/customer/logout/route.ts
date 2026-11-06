import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const response = NextResponse.redirect(new URL("/account", request.url), { status: 303 });
  response.headers.append(
    "set-cookie",
    "veyrith_customer=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  );
  return response;
}
