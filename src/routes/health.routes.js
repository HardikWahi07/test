import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

router.get("/health", async (_req, res) => {
  let dbStatus = "unknown";
  try {
    // Quick raw query to verify database connectivity
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    dbStatus = "disconnected";
  }

  res.json({
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus,
      environment: process.env.NODE_ENV || "development",
    },
  });
});

export default router;

