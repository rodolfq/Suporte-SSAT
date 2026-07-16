import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import {
  listFilaOperadoresFull,
  listFilaOperadoresPlain,
  insertFilaOperador,
  upsertFilaOperadores,
  deleteFilaOperadoresByIds,
  updateFilaOperador,
} from '@/lib/db/queue';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const filaId = req.nextUrl.searchParams.get('filaId');
  if (!filaId) return NextResponse.json({ error: 'filaId is required' }, { status: 400 });
  const plain = req.nextUrl.searchParams.get('plain') === 'true';
  const data = plain ? await listFilaOperadoresPlain(filaId) : await listFilaOperadoresFull(filaId);
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { fila_id, operador_id, ordem } = await req.json();
  const row = await insertFilaOperador(fila_id, operador_id, ordem);
  return NextResponse.json({ data: row });
}

export async function PUT(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { rows } = await req.json();
  const data = await upsertFilaOperadores(rows);
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await updateFilaOperador(id, fields);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { ids } = await req.json();
  await deleteFilaOperadoresByIds(Array.isArray(ids) ? ids : [ids]);
  return NextResponse.json({ success: true });
}
