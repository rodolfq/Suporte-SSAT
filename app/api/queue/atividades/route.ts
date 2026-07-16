import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listAtividades, insertAtividade, deleteAtividade } from '@/lib/db/queue';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const date = req.nextUrl.searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 });
  const data = await listAtividades(date);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  await insertAtividade(body);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await deleteAtividade(id);
  return NextResponse.json({ success: true });
}
