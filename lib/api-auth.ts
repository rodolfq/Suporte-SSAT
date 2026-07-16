import type { NextRequest } from 'next/server';
import { getSessionFromRequest, MASTER_ADMIN_EMAIL, type SessionClaims } from './auth';
import { getProfileRole } from './db/profiles';

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

export function requireMasterAdmin(req: NextRequest): SessionClaims | null {
  const session = getSessionFromRequest(req);
  if (!session || session.email !== MASTER_ADMIN_EMAIL) return null;
  return session;
}
