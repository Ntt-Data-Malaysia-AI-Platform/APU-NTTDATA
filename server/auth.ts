import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

/**
 * Single shared demo login. The session is a signed, HttpOnly cookie
 * (`user.expiry.signature`), so the server stays stateless on Cloud Run.
 * For production, replace this with APU single sign-on (e.g. Identity-Aware
 * Proxy with Microsoft Entra ID).
 */

const COOKIE = "apu_session";
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest();
const sign = (payload: string) =>
  crypto.createHmac("sha256", config.sessionSecret).update(payload).digest("base64url");

/** Constant-time comparison of both fields. */
export function checkCredentials(username: string, password: string): boolean {
  const userOk = crypto.timingSafeEqual(sha256(username), sha256(config.appUsername));
  const passOk = crypto.timingSafeEqual(sha256(password), sha256(config.appPassword));
  return userOk && passOk;
}

export function issueSession(req: Request, res: Response, username: string) {
  const payload = `${Buffer.from(username).toString("base64url")}.${Date.now() + TTL_MS}`;
  res.cookie(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    maxAge: TTL_MS,
    path: "/",
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const idx = part.indexOf("=");
    if (idx > 0 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export function readSession(req: Request): { user: string } | null {
  const raw = readCookie(req, COOKIE);
  if (!raw) return null;
  const [user64, expiry, sig] = raw.split(".");
  if (!user64 || !expiry || !sig) return null;
  const expected = Buffer.from(sign(`${user64}.${expiry}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  if (Number(expiry) < Date.now()) return null;
  return { user: Buffer.from(user64, "base64url").toString() };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = readSession(req);
  if (!session) {
    res.status(401).json({ error: "Please sign in." });
    return;
  }
  res.locals.user = session.user;
  next();
}

// Simple per-IP brake on password guessing: 10 failed attempts per 15 minutes.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; resetAt: number }>();

export function loginBlocked(ip: string): boolean {
  const f = failures.get(ip);
  if (!f) return false;
  if (f.resetAt < Date.now()) {
    failures.delete(ip);
    return false;
  }
  return f.count >= MAX_FAILURES;
}

export function recordFailure(ip: string) {
  const now = Date.now();
  const f = failures.get(ip);
  if (!f || f.resetAt < now) failures.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else f.count++;
  if (failures.size > 10000) failures.clear(); // bound memory
}

export function clearFailures(ip: string) {
  failures.delete(ip);
}
