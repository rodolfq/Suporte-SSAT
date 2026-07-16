import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listAiUsageToday, insertAiUsageLog } from '@/lib/db/kb';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await listAiUsageToday();
  const total = rows.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);
  return NextResponse.json({ queries: rows.length, tokens: total });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action_type, model_name, total_tokens } = await req.json();
  await insertAiUsageLog(action_type, model_name, total_tokens || 0);
  return NextResponse.json({ success: true });
}
