import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/api-auth';
import { listNotes, insertNote, insertChunk, deleteNote } from '@/lib/db/kb';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });

export async function GET(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ data: await listNotes() });
}

export async function POST(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Conteúdo vazio.' }, { status: 400 });
    }

    // 1. Save note record
    const note = await insertNote(content);

    // 2. Generate embedding and save to chunks (for RAG)
    const result = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text: content }] },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 768
    } as any);
    const embedding = result.embedding.values;

    try {
      await insertChunk(null, content, embedding);
    } catch (chunkError) {
      console.error('Error saving note chunk:', chunkError);
    }

    return NextResponse.json({ success: true, noteId: note.id });

  } catch (error: any) {
    console.error('Note error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!requireSession(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  await deleteNote(id);
  return NextResponse.json({ success: true });
}
