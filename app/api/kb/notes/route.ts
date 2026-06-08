import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Conteúdo vazio.' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase não inicializado.' }, { status: 500 });
    }

    // 1. Save note record
    const { data: note, error: noteError } = await supabase
      .from('kb_notes')
      .insert([{ content }])
      .select()
      .single();

    if (noteError) throw noteError;

    // 2. Generate embedding and save to chunks (for RAG)
    const result = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text: content }] },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 768
    } as any);
    const embedding = result.embedding.values;

    const { error: chunkError } = await supabase
      .from('kb_chunks')
      .insert([{
        content: content,
        embedding: embedding
      }]);
    
    if (chunkError) console.error('Error saving note chunk:', chunkError);

    return NextResponse.json({ success: true, noteId: note.id });

  } catch (error: any) {
    console.error('Note error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}