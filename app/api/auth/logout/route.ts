import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
