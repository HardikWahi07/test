import { verifyUserToken } from "../lib/auth.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Bearer token.",
    });
  }

  const token = authHeader.slice(7).trim();
  const user = await verifyUserToken(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired session token.",
    });
  }

  req.user = user;
  next();
}

