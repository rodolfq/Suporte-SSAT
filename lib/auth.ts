import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

// Mirrors the previous Supabase access-token lifetime (1h) and the 10-minute
// pre-expiry refresh window the client heartbeat used to watch for.
export const SESSION_TTL_SECONDS = 60 * 60;
export const REFRESH_THRESHOLD_SECONDS = 10 * 60;

export const SESSION_COOKIE = 'ssat_session';

// The one email that gets the client-side "all permissions" bypass and
// admin-route authorization bypass, matching the previous hardcoded checks.
export const MASTER_ADMIN_EMAIL = 'admin@systemsat.com.br';

export interface SessionPayload {
  sub: string;
  email: string;
}

export type SessionClaims = SessionPayload & { iat: number; exp: number };

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });
}

export function verifySessionToken(token: string): SessionClaims | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionClaims;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): SessionClaims | null {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getBearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
