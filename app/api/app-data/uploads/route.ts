import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listUploads, insertUpload, deleteUpload, deleteAllUploads } from '@/lib/db/app-data';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: await listUploads() });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const row = await insertUpload(body);
  return NextResponse.json({ data: row });
}

export async function DELETE(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  const all = req.nextUrl.searchParams.get('all') === 'true';
  if (all) {
    await deleteAllUploads();
  } else if (id) {
    await deleteUpload(id);
  } else {
    return NextResponse.json({ error: 'id or all is required' }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
