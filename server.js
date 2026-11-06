import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.routes.js";
import healthRoutes from "./src/routes/health.routes.js";
import { notFoundHandler, errorHandler } from "./src/middleware/errorHandler.js";
import prisma from "./src/lib/prisma.js";

const app = express();
const PORT = process.env.SERVER_PORT || process.env.PORT || 4000;

// Security & Parsing Middleware
app.use(
  cors({
    origin: [
      process.env.PUBLIC_SITE_URL || "http://localhost:3000",
      process.env.ADMIN_CMS_URL || "http://localhost:3001",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Request Logging (Development)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Root Info Route
app.get("/", (_req, res) => {
  res.json({
    service: "Veyrith Labs API",
    status: "active",
    version: "2.0.0",
    endpoints: {
      health: "/api/health",
      auth: {
        signup: "POST /api/auth/signup",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me (Bearer Token required)",
        logout: "POST /api/auth/logout",
      },
    },
  });
});

// Mount Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Server Startup
const server = app.listen(PORT, () => {
  console.log(`🚀 Veyrith Labs API server running on http://localhost:${PORT}`);
  console.log(`   Health check available at http://localhost:${PORT}/api/health`);
});

// Graceful Shutdown
async function shutdown(signal) {
  console.log(`\n[${signal}] Initiating graceful shutdown...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Prisma client disconnected successfully.");
      process.exit(0);
    } catch (err) {
      console.error("Error during database disconnection:", err);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

export default app;
