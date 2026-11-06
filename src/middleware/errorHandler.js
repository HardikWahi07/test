import { ZodError } from "zod";

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: issues,
    });
  }

  // Handle Prisma unique constraint violations (e.g. duplicate username/email)
  if (err.code === "P2002") {
    const fields = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : "field";
    return res.status(409).json({
      success: false,
      error: `A record with this ${fields} already exists.`,
    });
  }

  // Handle Prisma record not found
  if (err.code === "P2025") {
    return res.status(404).json({
      success: false,
      error: "Requested record was not found.",
    });
  }

  // Handle JSON parse errors
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "Invalid JSON payload.",
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === "production"
    ? "An unexpected internal server error occurred."
    : (err.message || "Internal server error");

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

