import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionFromRequest,
  signSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  SESSION_TTL_SECONDS,
  REFRESH_THRESHOLD_SECONDS,
} from '@/lib/auth';

// Also serves as the sliding-session refresh point: the client heartbeat polls
// this every 5 minutes, and if the current token is within 10 minutes of
// expiring we transparently reissue a fresh one (mirrors the previous
// Supabase heartbeat's proactive refreshSession() call).
export async function GET(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const secondsLeft = session.exp - Math.floor(Date.now() / 1000);
  const res = NextResponse.json({ user: { id: session.sub, email: session.email } });

  if (secondsLeft < REFRESH_THRESHOLD_SECONDS) {
    const token = signSessionToken({ sub: session.sub, email: session.email });
    res.cookies.set(SESSION_COOKIE, token, { ...SESSION_COOKIE_OPTIONS, maxAge: SESSION_TTL_SECONDS });
  }

  return res;
}
