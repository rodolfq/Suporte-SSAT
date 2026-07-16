import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listCollaboratorSettings, upsertCollaboratorSetting, deleteCollaboratorSetting } from '@/lib/db/app-data';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: await listCollaboratorSettings() });
}

export async function PUT(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  await upsertCollaboratorSetting(body);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const name = req.nextUrl.searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  await deleteCollaboratorSetting(name);
  return NextResponse.json({ success: true });
}
