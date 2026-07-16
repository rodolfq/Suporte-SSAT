import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import {
  listDashboardLayouts,
  unsetDefaultLayouts,
  upsertDashboardLayout,
  updateDashboardLayoutById,
  deleteDashboardLayout,
} from '@/lib/db/app-data';

export async function GET(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: await listDashboardLayouts(session.sub) });
}

export async function POST(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { name, layout, is_default } = await req.json();
    if (is_default) {
      await unsetDefaultLayouts(session.sub);
    }
    const row = await upsertDashboardLayout({ user_id: session.sub, name, layout, is_default: !!is_default });
    return NextResponse.json({ data: row });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, layout } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await updateDashboardLayoutById(id, session.sub, layout);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = requireSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await deleteDashboardLayout(id, session.sub);
  return NextResponse.json({ success: true });
}
