import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 });
    }

    // 1. Generate embedding for the query
    const embedResult = await embeddingModel.embedContent({
      content: { role: 'user', parts: [{ text: message }] },
      taskType: TaskType.RETRIEVAL_QUERY,
      outputDimensionality: 768
    } as any);
    const queryEmbedding = embedResult.embedding.values;

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase não inicializado.' }, { status: 500 });
    }

    // 2. Search for relevant chunks in Supabase
    console.log('Searching Supabase with embedding length:', queryEmbedding.length);
    const { data: chunks, error: searchError } = await supabase.rpc('match_kb_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2,
      match_count: 5
    });

    if (searchError) {
      console.error('Search error:', searchError);
      throw searchError;
    }

    console.log('Chunks found in API:', chunks?.length || 0);

    // 3. Build context
    const context = chunks?.map((c: any) => c.content).join('\n\n---\n\n');

    if (!context) {
      return NextResponse.json({ response: 'Desculpe, não encontrei informações relevantes na minha base de conhecimento para essa pergunta.' });
    }

    // 4. Call Gemini with context
    const prompt = `
Você é um assistente inteligente de base de conhecimento.
Sua tarefa é responder à pergunta do usuário baseando-se EXCLUSIVAMENTE no contexto fornecido abaixo.

REGRAS CRÍTICAS:
1. Nunca invente informações fora do contexto.
2. Se a resposta não estiver no contexto, diga explicitamente: "Desculpe, não encontrei essa informação na minha base de conhecimento."
3. Seja preciso, claro e direto.
4. Mantenha um tom profissional e prestativo.

CONTEXTO RECUPERADO:
${context}

PERGUNTA DO USUÁRIO:
${message}

RESPOSTA:
`;

    const result = await chatModel.generateContent(prompt);
    const response = result.response.text();

    return NextResponse.json({ response });

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}