import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { matchKbChunks } from '@/lib/db/kb';

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { query_embedding, match_threshold, match_count } = await req.json();
  const data = await matchKbChunks(query_embedding, match_threshold, match_count);
  return NextResponse.json({ data });
}
