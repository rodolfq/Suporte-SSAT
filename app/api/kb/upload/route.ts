import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import mammoth from 'mammoth';

// Polyfills for DOM classes missing in Node.js but expected by some PDF libraries
if (typeof global !== 'undefined') {
  if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
      constructor() {}
      static fromFloat32Array() { return new DOMMatrix(); }
      static fromFloat64Array() { return new DOMMatrix(); }
    };
  }
  if (typeof (global as any).DOMPoint === 'undefined') {
    (global as any).DOMPoint = class DOMPoint {
      constructor(x = 0, y = 0, z = 0, w = 1) { this.x = x; this.y = y; this.z = z; this.w = w; }
      x: number; y: number; z: number; w: number;
    };
  }
  if (typeof (global as any).DOMRect === 'undefined') {
    (global as any).DOMRect = class DOMRect {
      constructor(x = 0, y = 0, width = 0, height = 0) { this.x = x; this.y = y; this.width = width; this.height = height; }
      x: number; y: number; width: number; height: number;
    };
  }
}

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('NEXT_PUBLIC_GEMINI_API_KEY não configurada.');
      return NextResponse.json({ error: 'Configuração incompleta: API Key do Gemini ausente.' }, { status: 500 });
    }

    if (!supabase) {
      console.error('Supabase não inicializado. Verifique as variáveis de ambiente.');
      return NextResponse.json({ error: 'Supabase não inicializado.' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text = '';

    if (file.type === 'application/pdf') {
      try {
        console.log('Iniciando processamento de PDF...');
        // Polyfill for atob/btoa which might be needed by underlying pdf.js
        if (typeof (global as any).atob === 'undefined') {
          (global as any).atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
        }
        if (typeof (global as any).btoa === 'undefined') {
          (global as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
        }

        console.log('Importando pdf-parse...');
        // Use the main export of pdf-parse
        const pdfModule = await import('pdf-parse');
        // In this version (2.4.5), the parser seems to be exported as PDFParse
        const pdf = (pdfModule as any).PDFParse || (pdfModule as any).default?.PDFParse || (pdfModule as any).default || pdfModule;
        
        if (typeof pdf !== 'function') {
          console.error('Módulo pdf-parse não exportou uma função válida. Tipo encontrado:', typeof pdf);
          console.log('Keys do módulo:', Object.keys(pdfModule));
          throw new Error('O módulo pdf-parse não exportou uma função de parsing válida.');
        }

        console.log('Executando pdf-parse...');
        const data = await pdf(buffer, { 
          pagerender: () => "",
          max: 0
        });
        text = data.text;
        console.log('Texto extraído com sucesso. Tamanho:', text?.length || 0);
        
        if (!text || text.trim().length === 0) {
          throw new Error('Nenhum texto pôde ser extraído do PDF.');
        }
      } catch (pdfError: any) {
        console.error('Erro detalhado no processamento de PDF:', pdfError);
        throw new Error('Erro ao processar PDF: ' + pdfError.message);
      }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (file.type === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Tipo de arquivo não suportado.' }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'Não foi possível extrair texto do arquivo.' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase não inicializado.' }, { status: 500 });
    }

    // 1. Save document record
    console.log('Salvando registro do documento no Supabase...');
    const { data: doc, error: docError } = await supabase
      .from('kb_documents')
      .insert([{ 
        title: file.name, 
        file_type: file.type 
      }])
      .select()
      .single();

    if (docError) {
      console.error('Erro ao salvar documento no Supabase:', docError);
      throw docError;
    }

    console.log('Documento salvo. ID:', doc.id);

    // 2. Chunk text (~1000 characters)
    const chunks = chunkText(text, 1000);
    console.log('Texto dividido em', chunks.length, 'chunks.');

    // 3. Generate embeddings and save chunks
    console.log('Gerando embeddings e salvando chunks...');
    for (const chunk of chunks) {
      const result = await embeddingModel.embedContent({
        content: { role: 'user', parts: [{ text: chunk }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        outputDimensionality: 768
      } as any);
      const embedding = result.embedding.values;

      const { error: chunkError } = await supabase
        .from('kb_chunks')
        .insert([{
          document_id: doc.id,
          content: chunk,
          embedding: embedding
        }]);
      
      if (chunkError) {
        console.error('Erro ao salvar chunk no Supabase:', chunkError);
      }
    }

    return NextResponse.json({ success: true, documentId: doc.id });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + word).length > size) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += word + ' ';
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}