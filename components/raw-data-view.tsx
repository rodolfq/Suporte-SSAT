'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '@/context/app-context';
import FilterBar from './filter-bar';
import { Table, ArrowLeft, AlertCircle, CheckCircle2, XCircle, Filter, Trash2, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MessageSquare, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface RawDataViewProps {
  onBack: () => void;
}

const ITEMS_PER_PAGE = 50;

export default function RawDataView({ onBack }: RawDataViewProps) {
  const { selectedRows, toggleRowExclusion, updateRowNote } = useApp();
  const [rowToToggle, setRowToToggle] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteRowId, setNoteRowId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showNoteSaved, setShowNoteSaved] = useState(false);

  const normalizeColumnName = (key: string): string => {
    // Normalize Cyrillic 'С' (U+0421) to Latin 'C' (U+0043) for matching
    const normalized = key.replace(/[\u0400-\u04FF]/g, char => {
      const cyrillicToLatin: Record<string, string> = {
        '\u0421': 'C', // Cyrillic С -> Latin C
      };
      return cyrillicToLatin[char] || char;
    });
    const lower = normalized.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    // Exclude timestamp columns that contain 'agente' - check these BEFORE generic 'agente' match
    if (lower.includes('encerrou') || lower.includes('respondeu')) return key;
    if (lower.includes('colaborador') || lower.includes('atendente')) return 'Colaborador';
    if (lower.includes('agente')) return 'Colaborador';
    if (lower.includes('cliente') || lower.includes('customer') || lower.includes('empresa')) return 'Cliente';
    if (lower.includes('mensagens') || lower.includes('atendimentos') || lower.includes('tickets') || lower.includes('volume')) return 'Mensagens';
    if (lower.includes('criado') || lower.includes('data') || lower.includes('date') || lower.includes('timestamp')) return 'Criado em';
    if (lower.includes('avaliado') || lower.includes('avaliacao') || lower.includes('rating') || lower.includes('csat')) return 'Avaliado pelos clientes';
    if (lower.includes('duracao') || lower.includes('conversa') || lower.includes('duration')) return 'Duração da conversa';
    if (lower.includes('tempo') || lower.includes('resposta') || lower.includes('response')) return 'Tempo inicial de resposta';
    return key;
  };

  const formatRawTimeToDisplay = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-';
    const num = Number(value);
    if (isNaN(num) || num === 0) return '-';
    if (num > 60) {
      const minutes = num / 60;
      if (minutes === Math.floor(minutes)) {
        return minutes + ' min';
      }
      return minutes.toFixed(2) + ' min';
    }
    return num + ' seg';
  };

  const dataToDisplay = useMemo(() => {
    return selectedRows.map((r, idx) => {
      const baseRow: Record<string, any> = {};
      
      // Set core fields from model FIRST to ensure they're not overwritten by rawData
      if (r.colaborador) {
        baseRow['Colaborador'] = r.colaborador;
      }
      if (r.cliente) {
        baseRow['Cliente'] = r.cliente;
      }
      if (r.mensagens !== undefined) {
        baseRow['Mensagens'] = r.mensagens;
      }
      
      // Then process rawData for other columns (skip core fields already set from model)
      if (r.rawData) {
        Object.entries(r.rawData).forEach(([key, value]) => {
          const normalizedKey = normalizeColumnName(key);
          // Don't overwrite core fields that were already set from the model
          if (normalizedKey !== 'Colaborador' && normalizedKey !== 'Cliente' && normalizedKey !== 'Mensagens') {
            baseRow[normalizedKey] = value;
          }
        });
      }
      if (!baseRow['Criado em'] && r.data) {
        baseRow['Criado em'] = r.data instanceof Date ? format(r.data, 'dd/MM/yyyy HH:mm:ss') : String(r.data);
      }
      if (!baseRow['O agente respondeu em']) {
        baseRow['O agente respondeu em'] = r.rawData?.['O agente respondeu em'] || r.rawData?.['Agente respondeu em'] || r.rawData?.['О agente respondeu em'] || '-';
      }
      if (!baseRow['O agente encerrou em']) {
        baseRow['O agente encerrou em'] = r.rawData?.['O agente encerrou em'] || r.rawData?.['Agente encerrou em'] || r.rawData?.['О agente encerrou em'] || '-';
      }
      if (!baseRow['Duração da conversa'] || baseRow['Duração da conversa'] === '-') {
        const rawSeconds = r.duracaoSegundos;
        if (rawSeconds !== null && rawSeconds !== undefined) {
          baseRow['Duração da conversa'] = formatRawTimeToDisplay(rawSeconds);
        } else if (r.duracao !== null && r.duracao !== undefined) {
          const seconds = r.duracao * 60;
          baseRow['Duração da conversa'] = formatRawTimeToDisplay(seconds);
        } else {
          baseRow['Duração da conversa'] = '-';
        }
      } else {
        const existing = baseRow['Duração da conversa'];
        const num = Number(existing);
        if (!isNaN(num) && num > 0) {
          baseRow['Duração da conversa'] = formatRawTimeToDisplay(num);
        }
      }
      if (!baseRow['Tempo inicial de resposta'] || baseRow['Tempo inicial de resposta'] === '-') {
        const rawSeconds = r.tempoRespostaSegundos;
        if (rawSeconds !== null && rawSeconds !== undefined) {
          baseRow['Tempo inicial de resposta'] = formatRawTimeToDisplay(rawSeconds);
        } else if (r.tempoResposta !== null && r.tempoResposta !== undefined) {
          const seconds = r.tempoResposta * 60;
          baseRow['Tempo inicial de resposta'] = formatRawTimeToDisplay(seconds);
        } else {
          baseRow['Tempo inicial de resposta'] = '-';
        }
      } else {
        const existing = baseRow['Tempo inicial de resposta'];
        const num = Number(existing);
        if (!isNaN(num) && num > 0) {
          baseRow['Tempo inicial de resposta'] = formatRawTimeToDisplay(num);
        }
      }
      if (!baseRow['Avaliado pelos clientes']) {
        baseRow['Avaliado pelos clientes'] = r.avaliacao || r.avaliadoPelosClientes || '-';
      }

      return {
        'id': r.id,
        '#': r.rawData?.['#'] || r.rawData?.['ID'] || idx + 1,
        ...baseRow,
        '_date': r.data,
        '_isExcluded': r.isExcluded,
        '_exclusionReason': r.exclusionReason,
        '_notes': r.notes
      };
    });
  }, [selectedRows]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return dataToDisplay.slice(startIndex, endIndex);
  }, [dataToDisplay, currentPage]);

  const totalPages = Math.ceil(dataToDisplay.length / ITEMS_PER_PAGE) || 1;

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const goToFirstPage = useCallback(() => goToPage(1), [goToPage]);
  const goToLastPage = useCallback(() => goToPage(totalPages), [goToPage, totalPages]);
  const goToPrevPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const goToNextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);

  const getRowStatus = (row: any) => {
    return {
      isExcluded: row._isExcluded === true,
      reasons: row._exclusionReason ? [row._exclusionReason] : []
    };
  };

  const allColumns = [
    '#',
    'Cliente',
    'Mensagens',
    'Colaborador',
    'Criado em',
    'O agente respondeu em',
    'O agente encerrou em',
    'Duração da conversa',
    'Tempo inicial de resposta',
    'Avaliado pelos clientes'
  ];

  const handleToggleClick = (rowId: string | undefined) => {
    if (rowId) {
      setRowToToggle(rowId);
      setShowConfirmDialog(true);
    }
  };

  const handleNoteClick = (rowId: string | undefined, notes: string | undefined) => {
    if (rowId) {
      setNoteRowId(rowId);
      setNoteText(notes || '');
      setShowNoteDialog(true);
    }
  };

  const confirmToggle = async () => {
    if (rowToToggle) {
      const row = selectedRows.find(r => r.id === rowToToggle);
      const currentlyExcluded = row?.isExcluded || false;
      await toggleRowExclusion(rowToToggle, !currentlyExcluded, currentlyExcluded ? undefined : 'Excluído manualmente');
      setShowConfirmDialog(false);
      setRowToToggle(null);
    }
  };

  const saveNote = async () => {
    if (noteRowId) {
      await updateRowNote(noteRowId, noteText);
      setShowNoteSaved(true);
      setTimeout(() => {
        setShowNoteSaved(false);
        setShowNoteDialog(false);
        setNoteRowId(null);
        setNoteText('');
      }, 1500);
    }
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  if (dataToDisplay.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Table className="w-10 h-10 text-slate-300 dark:text-slate-700" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Nenhum dado bruto disponível</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
          Faça o upload de uma planilha primeiro para visualizar os dados originais sem tratamento.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Upload
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors mb-2 text-sm font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Dados Brutos</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Visualize os dados originais e verifique a aplicação das regras de filtragem.</p>
        </div>
      </div>

      <FilterBar placeholder="Buscar nos dados brutos..." showAdvancedFilters={true} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Regra de Colaborador</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-tight">Mínimo 3 caracteres, não vazio e não reservado (ex: total, média).</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Regra de Mensagens</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-tight">Valor da coluna "Mensagens" deve ser maior ou igual a 3.</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Conversão de Tempo</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-tight">Segundos são convertidos para minutos no processamento.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-20">Ações</th>
                {allColumns.map(col => (
                  <th key={col} className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedData.map((row, idx) => {
                const status = getRowStatus(row);
                const hasNote = row._notes;
                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    key={row.id || idx} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group`}
                  >
                    <td className={`px-6 py-4 ${status.isExcluded ? 'relative' : ''}`}>
                      {status.isExcluded && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="w-full h-full border-t-2 border-rose-500 absolute top-1/2"></div>
                        </div>
                      )}
                      <div className={status.isExcluded ? 'opacity-50' : ''}>
                        {status.isExcluded ? (
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400" title={status.reasons.join(', ')}>
                            <XCircle className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Excluído</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase">Incluído</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-4 w-20">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleToggleClick(row.id)}
                          className={`p-1.5 rounded-lg transition-all ${
                            status.isExcluded 
                              ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' 
                              : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                          }`}
                          title={status.isExcluded ? 'Restaurar item' : 'Excluir item'}
                        >
                          {status.isExcluded ? (
                            <RotateCw className="w-4 h-4" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleNoteClick(row.id, row._notes || undefined)}
                          className={`p-1.5 rounded-lg transition-all ${
                            hasNote 
                              ? 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20' 
                              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Adicionar/Editar nota"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    {allColumns.map(col => {
                      const val = (row as any)[col];
                      return (
                        <td key={col} className={`px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap ${status.isExcluded ? 'opacity-50' : ''}`}>
                          {val === undefined || val === null ? (
                            <span className="text-slate-300 dark:text-slate-700 italic">vazio</span>
                          ) : typeof val === 'object' && val instanceof Date ? (
                            val.toLocaleString()
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, dataToDisplay.length)} de {dataToDisplay.length} linhas
          </p>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Válido</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Filtrado</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Itens por página:</span>
            <select
              value={ITEMS_PER_PAGE}
              disabled
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-bold"
            >
              <option value={50}>50</option>
            </select>
          </div>

          <nav className="flex items-center gap-1" aria-label="Paginação">
            <button
              onClick={goToFirstPage}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Primeira página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      currentPage === pageNum
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="text-xs text-slate-500 px-1">...</span>
              )}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <button
                  onClick={() => goToPage(totalPages)}
                  className="w-8 h-8 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={goToLastPage}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmDialog && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowConfirmDialog(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl z-50 max-w-sm w-full border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confirmar Ação</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {selectedRows.find(r => r.id === rowToToggle)?.isExcluded 
                  ? 'Restaurar este atendimento?' 
                  : 'Excluir este atendimento da análise?'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmToggle}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNoteDialog && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowNoteDialog(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl z-50 max-w-sm w-full border border-slate-200 dark:border-slate-800"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nota do Atendimento</h3>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Digite sua anotação..."
                className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowNoteDialog(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Cancelar
                </button>
<button
                   onClick={saveNote}
                   disabled={showNoteSaved}
                   className={`flex-1 px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                     showNoteSaved 
                       ? 'bg-emerald-600 text-white' 
                       : 'bg-primary text-white hover:opacity-90'
                   }`}
                 >
{showNoteSaved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salvo!</span>
                      </>
                    ) : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}