import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), { status: 303 });
  response.headers.append(
    "set-cookie",
    "veyrith_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
  );
  return response;
}
