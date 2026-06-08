'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Upload, 
  Plus, 
  Send, 
  FileText, 
  MessageSquare, 
  Trash2, 
  Loader2, 
  ChevronRight,
  Search,
  File,
  StickyNote,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import { GoogleGenAI } from "@google/genai";
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  // Using unpkg as it's generally more reliable for specific versions
  const version = '5.6.205'; // Hardcoded to match package.json for stability
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
}

const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: geminiKey });

interface Document {
  id: string;
  title: string;
  file_type: string;
  created_at: string;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState<'chat' | 'documents' | 'notes'>('chat');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [dailyUsage, setDailyUsage] = useState<{ queries: number; tokens: number }>({ queries: 0, tokens: 0 });
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
    fetchNotes();
    fetchDailyUsage();
  }, []);

  const fetchDailyUsage = async () => {
    if (!supabase) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('total_tokens')
      .gte('created_at', today.toISOString());
    
    if (!error && data) {
      const total = data.reduce((acc, curr) => acc + (curr.total_tokens || 0), 0);
      setDailyUsage({
        queries: data.length,
        tokens: total
      });
    }
  };

  const logUsage = async (action: string, model: string, tokens: number) => {
    if (!supabase) return;
    await supabase.from('ai_usage_logs').insert([{
      action_type: action,
      model_name: model,
      total_tokens: tokens
    }]);
    fetchDailyUsage();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchDocuments = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('kb_documents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setDocuments(data);

    // Fetch total chunks for debugging
    const { count } = await supabase
      .from('kb_chunks')
      .select('*', { count: 'exact', head: true });
    setTotalChunks(count || 0);
  };

  const fetchNotes = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('kb_notes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setNotes(data);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    try {
      if (!supabase) {
        throw new Error('Supabase não está configurado. Verifique as chaves no painel Secrets.');
      }
      let text = '';

      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ 
          data: arrayBuffer,
          // Disable worker if the external script fails to load
          disableWorker: true,
          useSystemFonts: true
        } as any);
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }
        text = fullText;
      } else if (file.type === 'text/plain') {
        text = await file.text();
      } else {
        // For DOCX we still need the backend as mammoth is better there
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/kb/upload', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Erro no upload');
        
        setUploadStatus({ type: 'success', message: 'Documento processado com sucesso!' });
        fetchDocuments();
        return;
      }

      if (!text.trim()) {
        throw new Error('Não foi possível extrair texto do arquivo.');
      }

      // 1. Create document record
      const { data: doc, error: docError } = await supabase!
        .from('kb_documents')
        .insert([{ title: file.name, file_type: file.type }])
        .select()
        .single();

      if (docError) throw docError;

      // 2. Chunk and Embed
      const chunks: string[] = [];
      const words = text.split(/\s+/);
      for (let i = 0; i < words.length; i += 200) {
        chunks.push(words.slice(i, i + 200).join(' '));
      }

      // Generate embeddings individually and sequentially to avoid "requests[]" API errors
      let savedChunks = 0;
      for (const chunk of chunks) {
        try {
          const embedResponse = await ai.models.embedContent({
            model: "gemini-embedding-2-preview",
            contents: [chunk],
            config: {
              outputDimensionality: 768
            }
          });
          
          // Track embedding usage (estimated 1 query per chunk)
          logUsage('upload_embedding', 'gemini-embedding-2-preview', chunk.length / 4); // Rough estimate as embedContent doesn't always return usageMetadata
          
          const embedding = embedResponse.embeddings?.[0]?.values;
          console.log('Embedding generated, length:', embedding?.length, 'is_array:', Array.isArray(embedding));
          
          if (embedding && Array.isArray(embedding)) {
            const hasInvalid = embedding.some(v => typeof v !== 'number' || isNaN(v) || !isFinite(v));
            if (hasInvalid) {
              console.error('Embedding contains invalid values (NaN, Infinity, or not a number)');
            }
          }

          console.log('Document ID for chunk:', doc?.id);

          if (!doc?.id) {
            console.error('Document ID is missing! doc object:', doc);
            throw new Error('ID do documento não encontrado após inserção.');
          }

          const { error: chunkError } = await supabase!
            .from('kb_chunks')
            .insert([{
              document_id: doc.id,
              content: chunk,
              embedding: embedding
            }]);
          
          if (chunkError) {
            console.error('Error saving chunk - Full Error Object:', chunkError);
            // Try to log properties manually in case it's not a plain object
            Object.keys(chunkError).forEach(key => {
              console.log(`chunkError[${key}]:`, (chunkError as any)[key]);
            });
            
            console.error('Error message:', chunkError.message);
            console.error('Error code:', chunkError.code);
            console.error('Error details:', chunkError.details);
            console.error('Error hint:', chunkError.hint);
            
            // Se o erro for de dimensão (22000 no Postgres)
            if (chunkError.code === '22000' || chunkError.message?.includes('dimensions')) {
              setUploadStatus({ 
                type: 'error', 
                message: 'Erro de dimensão: O banco de dados espera 768 dimensões. O código foi ajustado para limitar a saída do Gemini para 768. Por favor, certifique-se de que sua tabela kb_chunks use vector(768).' 
              });
              return;
            }
            
            // Se o erro for de tabela inexistente (42P01 no Postgres)
            if (chunkError.code === '42P01') {
              setUploadStatus({ 
                type: 'error', 
                message: 'Erro de banco de dados: A tabela "kb_chunks" não existe. Por favor, execute o script SQL de migração no painel do Supabase.' 
              });
              return; // Para o processamento
            }
          } else {
            savedChunks++;
          }
        } catch (chunkError: any) {
          console.error('Erro ao processar chunk:', chunkError);
          // Continue with next chunks even if one fails
        }
      }

      console.log(`Successfully saved ${savedChunks} out of ${chunks.length} chunks.`);
      setUploadStatus({ type: 'success', message: `Documento processado! ${savedChunks} partes indexadas.` });
      fetchDocuments();
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus({ type: 'error', message: error.message || 'Erro ao processar documento.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const response = await fetch('/api/kb/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });

      if (response.ok) {
        setNewNote('');
        fetchNotes();
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      if (!supabase) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Erro: Supabase não configurado.' }]);
        return;
      }

      // 1. Generate embedding for query
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: [userMessage],
        config: {
          outputDimensionality: 768
        }
      });
      const queryEmbedding = embedResponse.embeddings?.[0]?.values;

      if (!queryEmbedding) {
        throw new Error('Não foi possível gerar o embedding para a sua pergunta.');
      }

      // 2. Search Supabase
      console.log('Searching Supabase with embedding:', queryEmbedding.slice(0, 5), '...');
      const { data: chunks, error: searchError } = await supabase!.rpc('match_kb_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.2, // Lowered threshold for better recall
        match_count: 5
      });

      if (searchError) {
        console.error('Supabase RPC error:', searchError);
        throw searchError;
      }

      console.log('Chunks found:', chunks?.length || 0);
      if (chunks && chunks.length > 0) {
        console.log('First chunk similarity:', chunks[0].similarity);
        console.log('First chunk content preview:', chunks[0].content.substring(0, 100));
      }

      const context = chunks?.map((c: any) => c.content).join('\n\n---\n\n');
      
      if (!context) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Não encontrei informações relevantes na base de conhecimento para essa pergunta. Tente re-enviar o documento ou ser mais específico.' }]);
        return;
      }

      // 3. Call Gemini
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
${userMessage}

RESPOSTA:
`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ parts: [{ text: prompt }] }]
      });

      // Track usage
      const usageMetadata = (result as any).response?.usageMetadata;
      if (usageMetadata) {
        logUsage('chat', 'gemini-2.0-flash', usageMetadata.totalTokenCount);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: result.text || 'Sem resposta.' }]);
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro ao processar sua pergunta: ' + (error.message || 'Erro desconhecido') }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('kb_documents').delete().eq('id', id);
    if (!error) fetchDocuments();
  };

  const deleteNote = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('kb_notes').delete().eq('id', id);
    if (!error) fetchNotes();
  };

  return (
    <div className="flex flex-col flex-1 min-h-[600px] bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header / Tabs */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'chat' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <MessageSquare className="w-4 h-4" />
            Chat Inteligente
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'documents' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <FileText className="w-4 h-4" />
            Documentos ({documents.length})
          </button>
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'notes' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            <StickyNote className="w-4 h-4" />
            Notas ({notes.length})
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setUploadStatus({ type: 'error', message: 'Integração com Google Drive em desenvolvimento. Por enquanto, use o Upload manual.' })}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Search className="w-4 h-4 text-blue-500" />
            Google Drive
          </button>
          <label className="cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20">
            <Upload className="w-4 h-4" />
            Upload Doc
            <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.txt,.docx" />
          </label>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {uploadStatus && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold shadow-xl ${uploadStatus.type === 'success' ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
              {uploadStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {uploadStatus.message}
              <button onClick={() => setUploadStatus(null)} className="ml-2 hover:opacity-70">×</button>
            </div>
          )}

          {activeTab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sua Base de Conhecimento</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                        Faça perguntas sobre seus documentos e notas. A IA responderá com base no conteúdo armazenado.
                      </p>
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-white shadow-lg shadow-primary/10' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs font-medium text-slate-500">IA está pensando...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                <div className="relative max-w-4xl mx-auto">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Pergunte qualquer coisa sobre sua base de conhecimento..."
                    className="w-full pl-6 pr-16 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'documents' && (
            <div className="flex-1 overflow-y-auto p-8 pt-12 space-y-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm hover:border-primary/50 transition-all group relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl">
                        <File className="w-6 h-6" />
                      </div>
                      <button 
                        onClick={() => deleteDocument(doc.id)} 
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Excluir documento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate mb-1 pr-8">{doc.title}</h4>
                    <p className="text-[10px] text-slate-400 uppercase font-black">
                      {new Date(doc.created_at).toLocaleDateString()} • {doc.file_type}
                    </p>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-400 italic">
                    Nenhum documento enviado ainda.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="flex-1 overflow-y-auto p-8 pt-10 space-y-6 custom-scrollbar">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Nova Nota Rápida
                </h4>
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Digite sua nota ou uma pergunta/resposta aqui..."
                  className="w-full h-32 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm"
                />
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    Salvar Nota
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes.map((note) => (
                  <div key={note.id} className="p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] shadow-sm relative group">
                    <button onClick={() => deleteNote(note.id)} className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap mb-4">{note.content}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Quick Stats / Recent */}
        <div className="w-80 border-l border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 p-8 hidden xl:block">
          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Status da Base</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Documentos</span>
                  <span className="text-xs font-black text-primary">{documents.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Notas</span>
                  <span className="text-xs font-black text-primary">{notes.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <span className="text-xs font-bold text-slate-500">Partes Indexadas</span>
                  <span className="text-xs font-black text-emerald-500">{totalChunks}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Uso de IA (Hoje - Plano Gratuito)</h3>
              <div className="space-y-3">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Consultas</span>
                    <span className="text-sm font-black text-primary">{dailyUsage.queries} <span className="text-[10px] text-slate-400 font-normal">/ 1.500</span></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Tokens Estimados</span>
                    <span className="text-sm font-black text-blue-500">{dailyUsage.tokens.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ 1M</span></span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase mb-1">
                      <span>Consumo Diário</span>
                      <span>{Math.round(Math.max((dailyUsage.tokens / 1000000) * 100, (dailyUsage.queries / 1500) * 100))}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max((dailyUsage.tokens / 1000000) * 100, (dailyUsage.queries / 1500) * 100))}%` }}
                        className={`h-full ${dailyUsage.queries > 1200 || dailyUsage.tokens > 800000 ? 'bg-red-500' : 'bg-primary'}`}
                      />
                    </div>
                    <p className="text-[8px] text-slate-400 mt-2 leading-tight">
                      * Limites baseados no plano gratuito do Gemini (1.500 requisições/dia).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dicas de Uso</h3>
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">1</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Faça upload de manuais ou procedimentos em PDF.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">2</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Use o chat para tirar dúvidas rápidas baseadas no conteúdo.
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-primary">3</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    A IA não inventa dados; se não estiver na base, ela dirá.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}