import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listOperators, listActiveOperators, updateOperator } from '@/lib/db/queue';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true';
  const data = activeOnly ? await listActiveOperators() : await listOperators();
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await updateOperator(id, fields);
  return NextResponse.json({ success: true });
}
