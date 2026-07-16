import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listAlmocoFilaOperadorIds, insertAlmocos, updateAlmocoHorario } from '@/lib/db/queue';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ids = (req.nextUrl.searchParams.get('filaOperadorIds') || '').split(',').filter(Boolean);
  const existing = await listAlmocoFilaOperadorIds(ids);
  return NextResponse.json({ data: Array.from(existing) });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { filaOperadorIds } = await req.json();
  await insertAlmocos(filaOperadorIds);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { filaOperadorId, horario } = await req.json();
  await updateAlmocoHorario(filaOperadorId, horario);
  return NextResponse.json({ success: true });
}
