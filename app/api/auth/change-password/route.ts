import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { updateUserPassword } from '@/lib/db/users';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { newPassword } = await req.json();
  if (!newPassword) return NextResponse.json({ error: 'newPassword is required' }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  await updateUserPassword(session.sub, passwordHash);
  return NextResponse.json({ success: true });
}
