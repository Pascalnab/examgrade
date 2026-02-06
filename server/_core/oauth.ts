import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { createSessionToken } from "./session";

const SALT_ROUNDS = 12;

export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/signup
   * Create a new account with email and password
   */
  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (typeof email !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Invalid input" });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({ error: "Invalid email format" });
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }

      // Check if email already exists
      const existingUser = await db.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        res.status(409).json({ error: "An account with this email already exists" });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Generate a unique openId for this user
      const openId = `email_${nanoid(21)}`;

      // Create user
      await db.upsertUser({
        openId,
        name: typeof name === "string" && name.trim() ? name.trim() : null,
        email: email.toLowerCase(),
        passwordHash,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      // Create session
      const sessionToken = await createSessionToken(openId, {
        name: name || email.split("@")[0],
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Signup failed:", error);
      res.status(500).json({ error: "Signup failed. Please try again." });
    }
  });

  /**
   * POST /api/auth/login
   * Sign in with email and password
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: "Email and password are required" });
        return;
      }

      if (typeof email !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Invalid input" });
        return;
      }

      // Look up user by email
      const user = await db.getUserByEmail(email.toLowerCase());
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Update last signed in
      await db.upsertUser({
        openId: user.openId,
        lastSignedIn: new Date(),
      });

      // Create session
      const sessionToken = await createSessionToken(user.openId, {
        name: user.name || email.split("@")[0],
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      res.status(500).json({ error: "Login failed. Please try again." });
    }
  });
}
