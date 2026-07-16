import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { getProfileById, getProfileByEmail, updateProfileLayout } from '@/lib/db/profiles';

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let profile = await getProfileById(session.sub);
  if (!profile) {
    profile = await getProfileByEmail(session.email);
  }
  return NextResponse.json({ profile });
}

const LAYOUT_FIELDS = ['dashboard_layout', 'queue_layout', 'settings_layout'];

export async function PATCH(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const field = Object.keys(body)[0];
  if (!LAYOUT_FIELDS.includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  }
  await updateProfileLayout(session.sub, field as any, body[field]);
  return NextResponse.json({ success: true });
}
