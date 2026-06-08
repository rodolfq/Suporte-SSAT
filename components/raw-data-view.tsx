'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import FilterBar from './filter-bar';
import { Table, ArrowLeft, AlertCircle, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isWithinInterval, startOfDay, endOfDay, format } from 'date-fns';

interface RawDataViewProps {
  onBack: () => void;
}

export default function RawDataView({ onBack }: RawDataViewProps) {
  const { selectedRows } = useApp();

  const dataToDisplay = useMemo(() => {
    // We use selectedRows which now includes rawData for each row
    return selectedRows.map((r, idx) => {
      // Use rawData if available, otherwise fallback to processed fields
      const baseRow = r.rawData ? { ...r.rawData } : {
        'Colaborador': r.colaborador,
        'Cliente': r.cliente,
        'Mensagens': r.mensagens,
        'Criado em': r.data instanceof Date ? format(r.data, 'dd/MM/yyyy HH:mm:ss') : String(r.data),
        'O agente respondeu em': r.rawData?.['O agente respondeu em'] || '-',
        'O agente encerrou em': r.rawData?.['O agente encerrou em'] || '-',
        'Duração da conversa': r.duracao?.toFixed(2) || '-',
        'Tempo inicial de resposta': r.tempoResposta?.toFixed(2) || '-',
        'Avaliado pelos clientes': r.avaliacao || '-',
      };

      // Special handling for "Criado em" to show formatted date even in raw view if it's a number
      if (baseRow['Criado em'] && typeof baseRow['Criado em'] === 'number' && r.data instanceof Date) {
        baseRow['Criado em'] = format(r.data, 'dd/MM/yyyy HH:mm:ss');
      }

      return {
        '#': r.rawData?.['#'] || idx + 1,
        ...baseRow,
        '_date': r.data,
        '_isExcluded': r.isExcluded,
        '_exclusionReason': r.exclusionReason
      };
    });
  }, [selectedRows]);

  // Helper to check if a row would be excluded based on the rules
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

      <FilterBar placeholder="Buscar nos dados brutos..." />

      {/* Rules Summary Card */}
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
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-tight">Valor da coluna &quot;Mensagens&quot; deve ser maior ou igual a 3.</p>
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
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                {allColumns.map(col => (
                  <th key={col} className="px-6 py-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {dataToDisplay.map((row, idx) => {
                const status = getRowStatus(row);
                return (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(idx * 0.01, 0.5) }}
                    key={idx} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${status.isExcluded ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}
                  >
                    <td className="px-6 py-4">
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
                    </td>
                    {allColumns.map(col => {
                      const val = row[col];
                      return (
                        <td key={col} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
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
        
        {dataToDisplay.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum resultado encontrado para os filtros atuais.</p>
          </div>
        )}
        
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Mostrando {dataToDisplay.length} linhas
          </p>
          <div className="flex items-center gap-4">
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
      </div>
    </div>
  );
}