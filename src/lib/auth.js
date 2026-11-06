import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;
const JWT_EXPIRATION = "7d";

function getSecretKey() {
  const secret = process.env.AUTH_SESSION_SECRET || "default_development_secret_key_minimum_32_bytes_long!!";
  return new TextEncoder().encode(secret);
}

/**
 * Securely hashes a plain-text password using scrypt with a random 16-byte salt.
 */
export async function hashPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plain-text password against a stored salt:hash string using timing-safe comparison.
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof storedHash !== "string") {
    return false;
  }
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  try {
    const keyBuffer = Buffer.from(hash, "hex");
    const derivedKey = await scryptAsync(password.normalize("NFKC"), salt, keyBuffer.length);
    return timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

/**
 * Creates a signed JWT for the authenticated user.
 */
export async function signUserToken(user) {
  const secretKey = getSecretKey();
  return await new SignJWT({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secretKey);
}

/**
 * Verifies and decodes a user's JWT.
 */
export async function verifyUserToken(token) {
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (err) {
    return null;
  }
}

