'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/app-context';
import { processSpreadsheet, processOdooSpreadsheet } from '@/lib/data-utils';
import { CloudUpload, FileCheck, Loader2, Table, ChevronRight, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FileUploadProps {
  onComplete: () => void;
}

export default function FileUpload({ onComplete }: FileUploadProps) {
  const { setRawData, setOdooTicketsData, refreshData, clearAllData, isLoading, importIndicators, importLogs } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ total: number; collaborators: number; period: string } | null>(null);
  const [source, setSource] = useState<'chat' | 'odoo'>('chat');
  const [clearBeforeUpload, setClearBeforeUpload] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const handleFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv') {
      setError('Formato não suportado. Use apenas arquivos CSV.');
      return;
    }

    setFile(selectedFile);
    setError(null);
    
    try {
      if (clearBeforeUpload) {
        await clearAllData();
      }

      if (source === 'odoo') {
        const chats = await processOdooSpreadsheet(selectedFile);
        if (chats.length === 0) {
          setError('Nenhum chat válido encontrado na planilha do Odoo.');
          return;
        }
        
        setPreview({
          total: chats.length,
          collaborators: new Set(chats.map(t => t.assignee)).size,
          period: 'N/A'
        });
 
        await setOdooTicketsData(chats, selectedFile.name);
      } else {
        const { processed, raw, allRows, period, indicators, logs } = await processSpreadsheet(selectedFile);
        if (processed.length === 0 && allRows.length === 0) {
          setError('A planilha parece estar vazia ou não contém dados válidos.');
          return;
        }

        // Quick preview calculation
        const collabs = new Set(processed.map(d => d.colaborador)).size;
        
        setPreview({
          total: allRows.length,
          collaborators: collabs,
          period: `${format(period.start, 'dd/MM')} - ${format(period.end, 'dd/MM')}`
        });

        await setRawData(processed, allRows, selectedFile.name, raw, 'chat', indicators, logs);
      }
      
      await refreshData();
    } catch (err) {
      setError('Erro ao processar arquivo. Verifique a formatação.');
      console.error(err);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit border border-slate-200/50 dark:border-slate-700/50">
                <button
                  onClick={() => setSource('chat')}
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    source === 'chat' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Planilha Chat
                </button>
                <button
                  onClick={() => setSource('odoo')}
                  className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    source === 'odoo' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Planilha Odoo
                </button>
              </div>

            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={clearBeforeUpload}
                  onChange={(e) => setClearBeforeUpload(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-red-500 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 shadow-inner" />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-red-600 transition-colors uppercase tracking-tight">
                Limpar dados anteriores
              </span>
            </label>
          </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl px-6 py-16 text-center transition-all cursor-pointer group/drop ${
                isDragging ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                className="hidden"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover/drop:scale-110 transition-transform duration-500">
                <CloudUpload className="text-primary w-10 h-10" />
              </div>
              <h3 className="text-slate-900 dark:text-slate-100 text-2xl font-black tracking-tight mb-2">
                Arraste ou envie a planilha
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-xs mx-auto">
                Selecione o arquivo <span className="font-mono text-primary font-bold">CSV</span> exportado do {source === 'chat' ? 'Chat' : 'Odoo'}.
              </p>
              <button className="bg-primary text-white px-10 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-primary/25 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                Selecionar Arquivo
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium"
              >
                {error}
              </motion.div>
            )}

            {file && !error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl"
              >
                <FileCheck className="text-emerald-600 dark:text-emerald-400 w-6 h-6" />
                <div className="flex-1">
                  <p className="text-emerald-800 dark:text-emerald-200 text-sm font-semibold">Dados analisados com sucesso</p>
                  <p className="text-emerald-600/80 dark:text-emerald-400/80 text-xs">Arquivo: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</p>
                </div>
                <button 
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs font-bold uppercase tracking-wider"
                >
                  Trocar arquivo
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {file && !error && (
            <div className="mt-8 space-y-6">
              <div>
                <h4 className="text-slate-900 dark:text-slate-100 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Table className="w-4 h-4" />
                  Indicadores de Importação
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Total Lidos</p>
                    <p className="text-lg font-black text-blue-900 dark:text-blue-100">{importIndicators?.totalImported || 0}</p>
                  </div>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Processados</p>
                    <p className="text-lg font-black text-emerald-900 dark:text-emerald-100">{importIndicators?.totalProcessed || 0}</p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                    <p className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">Ignorados</p>
                    <p className="text-lg font-black text-orange-900 dark:text-orange-100">{importIndicators?.totalIgnored || 0}</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                    <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Duplicados</p>
                    <p className="text-lg font-black text-purple-900 dark:text-purple-100">{importIndicators?.totalDuplicates || 0}</p>
                  </div>
                </div>
              </div>

              {importLogs && importLogs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-slate-900 dark:text-slate-100 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Logs de Processamento
                    </h4>
                    <button 
                      onClick={() => setShowLogs(!showLogs)}
                      className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                    >
                      {showLogs ? 'Ocultar Logs' : 'Ver Detalhes'}
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {showLogs && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700 max-h-60 overflow-y-auto">
                          {importLogs.map((log, idx) => (
                            <div key={idx} className="p-3 flex items-start gap-3 text-xs">
                              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                log.type === 'error' ? 'bg-red-500' : 
                                log.type === 'duplicate' ? 'bg-purple-500' : 'bg-orange-500'
                              }`} />
                              <div className="flex-1">
                                <p className="font-bold text-slate-900 dark:text-slate-100">Linha {log.row}: {log.message}</p>
                                {log.details && <p className="text-slate-500 dark:text-slate-400 mt-1">{log.details}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            disabled={!file || !!error || isLoading}
            onClick={onComplete}
            className="flex-1 bg-primary text-white py-4 px-6 rounded-2xl font-bold text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <ChevronRight />}
            Gerar Ranking
          </button>
          <button
            disabled={!file || !!error || isLoading}
            onClick={onComplete}
            className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 py-4 px-6 rounded-2xl font-bold text-base hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Eye className="w-5 h-5" />
            Visualizar Análise
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h4 className="text-slate-900 dark:text-slate-100 text-sm font-bold uppercase tracking-wider mb-6">Prévia do Arquivo</h4>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-tighter">Total Atendimentos</p>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{preview !== null ? preview.total.toLocaleString() : '---'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-tighter">Colaboradores</p>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{preview !== null ? preview.collaborators : '---'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <Table className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-tighter">Período</p>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{preview?.period || '---'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary rounded-2xl p-6 text-white shadow-lg shadow-primary/20">
          <h4 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4" />
            Dica Rápida
          </h4>
          <p className="text-white/80 text-sm leading-relaxed mb-4">
            Garanta que os cabeçalhos das colunas estejam na primeira linha para uma detecção automática mais precisa dos dados.
          </p>
          <a className="inline-flex items-center gap-1 text-xs font-black uppercase hover:underline" href="#">
            Ver guia de formatação
            <ChevronRight className="w-3 h-3" />
          </a>
        </div>

        {/* Expected Format Table - Updated to match user's model */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h4 className="text-slate-900 dark:text-slate-100 text-sm font-bold uppercase tracking-wider mb-4">Formato Esperado</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-2 font-bold text-slate-400 dark:text-slate-500">Colaborador</th>
                  <th className="pb-2 font-bold text-slate-400 dark:text-slate-500">Cliente</th>
                  <th className="pb-2 font-bold text-slate-400 dark:text-slate-500">Criado em</th>
                  <th className="pb-2 font-bold text-slate-400 dark:text-slate-500">Tempo inicial de resposta</th>
                  <th className="pb-2 font-bold text-slate-400 dark:text-slate-500">Avaliado pelos clientes</th>
                </tr>
              </thead>
              <tbody className="text-slate-500 dark:text-slate-400">
                <tr>
                  <td className="py-2">Ana Julia</td>
                  <td className="py-2">João Silva</td>
                  <td className="py-2">11/03/2026 12:24:21</td>
                  <td className="py-2">17</td>
                  <td className="py-2">5</td>
                </tr>
                <tr>
                  <td className="py-2">Rafael Leal</td>
                  <td className="py-2">Maria Oliveira</td>
                  <td className="py-2">11/03/2026 12:12:52</td>
                  <td className="py-2">114</td>
                  <td className="py-2">5</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}