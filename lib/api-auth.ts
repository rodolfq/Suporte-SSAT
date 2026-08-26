import type { NextRequest } from 'next/server';
import { getSessionFromRequest, MASTER_ADMIN_EMAIL, type SessionClaims } from './auth';
import { getProfileById, getProfileRole } from './db/profiles';

export function requireSession(req: NextRequest): SessionClaims | null {
  return getSessionFromRequest(req);
}

export async function requireAdmin(req: NextRequest): Promise<SessionClaims | null> {
  const session = getSessionFromRequest(req);
  if (!session) return null;
  if (session.email === MASTER_ADMIN_EMAIL) return session;
  const role = await getProfileRole(session.sub);
  return role === 'admin' ? session : null;
}

// Grants access when the session belongs to the master admin, has the
// 'admin' role, or has the given granular permission flag set on its profile.
export async function requirePermission(req: NextRequest, permission: string): Promise<SessionClaims | null> {
  const session = getSessionFromRequest(req);
  if (!session) return null;
  if (session.email === MASTER_ADMIN_EMAIL) return session;
  const profile = await getProfileById(session.sub);
  if (!profile) return null;
  if (profile.role === 'admin') return session;
  return profile.permissions?.[permission] === true ? session : null;
}

export function requireMasterAdmin(req: NextRequest): SessionClaims | null {
  const session = getSessionFromRequest(req);
  if (!session || session.email !== MASTER_ADMIN_EMAIL) return null;
  return session;
}
