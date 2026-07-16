import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { countChunks, insertChunk } from '@/lib/db/kb';

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ count: await countChunks() });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { document_id, content, embedding } = await req.json();
    await insertChunk(document_id ?? null, content, embedding);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
