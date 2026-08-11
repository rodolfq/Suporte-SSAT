import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listOperators, listActiveOperators, updateOperator, createOperator } from '@/lib/db/queue';
import { namesMatch } from '@/lib/queue-names';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const activeOnly = req.nextUrl.searchParams.get('activeOnly') === 'true';
  const data = activeOnly ? await listActiveOperators() : await listOperators();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { nome, horario_trabalho } = await req.json();
  const nomeLimpo = typeof nome === 'string' ? nome.trim() : '';
  if (!nomeLimpo) return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 });

  // Idempotente: `operadores.nome` não tem UNIQUE e a lista de colaboradores usa
  // o nome completo ("Rafael Leal") onde a fila usa o primeiro nome ("Rafael").
  const existing = (await listOperators()).find((op: any) => namesMatch(op.nome, nomeLimpo));
  if (existing) return NextResponse.json({ data: existing, created: false });

  const data = await createOperator(nomeLimpo, horario_trabalho);
  return NextResponse.json({ data, created: true });
}

export async function PATCH(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await updateOperator(id, fields);
  return NextResponse.json({ success: true });
}
