import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { createSessionToken } from "./session";

/**
 * Google OAuth 2.0 configuration
 */
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Build the Google OAuth login URL
 */
export function buildGoogleLoginUrl(redirectUri: string): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", ENV.googleClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

/**
 * Exchange authorization code for tokens with Google
 */
async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: ENV.googleClientId,
      client_secret: ENV.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<{
    access_token: string;
    id_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
  }>;
}

/**
 * Fetch user info from Google using access token
 */
async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google userinfo fetch failed: ${response.status}`);
  }

  return response.json() as Promise<{
    sub: string;        // Google's unique user ID
    email: string;
    email_verified: boolean;
    name: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
  }>;
}

export function registerOAuthRoutes(app: Express) {
  /**
   * GET /api/oauth/google/login
   * Redirects the user to Google's OAuth consent screen
   */
  app.get("/api/oauth/google/login", (req: Request, res: Response) => {
    const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;
    const loginUrl = buildGoogleLoginUrl(redirectUri);
    res.redirect(302, loginUrl);
  });

  /**
   * GET /api/oauth/callback
   * Handles the OAuth callback from Google
   */
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const error = getQueryParam(req, "error");

    if (error) {
      console.error("[OAuth] Google returned error:", error);
      res.status(400).json({ error: `OAuth error: ${error}` });
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code, redirectUri);

      // Fetch user info
      const userInfo = await fetchGoogleUserInfo(tokens.access_token);

      if (!userInfo.sub) {
        res.status(400).json({ error: "Google user ID missing" });
        return;
      }

      // Use Google's `sub` as the openId (unique per user)
      const openId = `google_${userInfo.sub}`;

      // Upsert user in database
      await db.upsertUser({
        openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create JWT session token
      const sessionToken = await createSessionToken(openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      // Set session cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect to app
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Google callback failed:", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
