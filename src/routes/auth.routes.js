import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { hashPassword, verifyPassword, signUserToken } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long")
    .max(30, "Username must not exceed 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, hyphens, and underscores"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(128, "Password must not exceed 128 characters"),
  email: z.string().trim().email("Please provide a valid email address").optional().or(z.literal("")),
  name: z.string().trim().max(100).optional(),
});

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

// POST /api/auth/signup
router.post("/signup", async (req, res, next) => {
  try {
    const parsed = signupSchema.parse(req.body);
    const email = parsed.email ? parsed.email.toLowerCase() : null;

    // Check for existing user by username
    const existingByUsername = await prisma.user.findUnique({
      where: { username: parsed.username },
    });

    if (existingByUsername) {
      return res.status(409).json({
        success: false,
        error: "A user with this username already exists.",
      });
    }

    // Check for existing user by email if provided
    if (email) {
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingByEmail) {
        return res.status(409).json({
          success: false,
          error: "A user with this email already exists.",
        });
      }
    }

    const passwordHash = await hashPassword(parsed.password);

    const user = await prisma.user.create({
      data: {
        username: parsed.username,
        email,
        name: parsed.name || null,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = await signUserToken(user);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const identifier = parsed.username.toLowerCase();

    // Look up by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: parsed.username },
          { email: identifier },
        ],
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password.",
      });
    }

    const isValid = await verifyPassword(parsed.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or password.",
      });
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };

    const token = await signUserToken(safeUser);

    res.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me (Protected)
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found.",
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully.",
  });
});

export default router;

