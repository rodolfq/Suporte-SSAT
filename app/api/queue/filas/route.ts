import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listFilaDates, getFilaByDate, listFilasInRange, createFila, updateFilaHandover } from '@/lib/db/queue';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = req.nextUrl.searchParams;
  if (params.get('dates') === 'true') {
    return NextResponse.json({ data: await listFilaDates() });
  }
  const date = params.get('date');
  if (date) {
    return NextResponse.json({ data: await getFilaByDate(date) });
  }
  const start = params.get('start');
  const end = params.get('end');
  if (start && end) {
    return NextResponse.json({ data: await listFilasInRange(start, end) });
  }
  return NextResponse.json({ error: 'Missing query parameters' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, responsavel_passagem_turno_id } = await req.json();
  const row = await createFila(data, responsavel_passagem_turno_id ?? null);
  return NextResponse.json({ data: row });
}

export async function PATCH(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, responsavel_passagem_turno_id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await updateFilaHandover(id, responsavel_passagem_turno_id ?? null);
  return NextResponse.json({ success: true });
}
