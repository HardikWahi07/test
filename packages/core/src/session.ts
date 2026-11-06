import { SignJWT, jwtVerify } from "jose";
import { getServerEnv } from "./env";

export type SessionRole = "administrator" | "customer";

export interface SessionClaims {
  sub: string;
  role: SessionRole;
}

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function sessionSecret() {
  return new TextEncoder().encode(getServerEnv().AUTH_SESSION_SECRET);
}

export async function createSessionToken(claims: SessionClaims) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuer("veyrith-labs")
    .setAudience(claims.role)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(sessionSecret());
}

export async function readSessionToken(
  token: string,
  role: SessionRole,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      issuer: "veyrith-labs",
      audience: role,
      algorithms: ["HS256"],
    });
    if (payload.role !== role || typeof payload.sub !== "string") {
      return null;
    }
    return { sub: payload.sub, role };
  } catch {
    return null;
  }
}

export const SESSION_TTL = SESSION_TTL_SECONDS;
