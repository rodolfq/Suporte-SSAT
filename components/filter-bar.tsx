'use client';

import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, XCircle, Filter } from 'lucide-react';
import { useApp } from '@/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface FilterBarProps {
  showStatusFilter?: boolean;
  placeholder?: string;
}

export default function FilterBar({ showStatusFilter = true, placeholder = "Buscar..." }: FilterBarProps) {
  const {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    dateFilter,
    setDateFilter,
    customRange,
    setCustomRange,
    dateRange
  } = useApp();

  const [isDateOpen, setIsDateOpen] = useState(false);

  const dateOptions = [
    { id: 'all', label: 'Todo o Período' },
    { id: 'today', label: 'Hoje' },
    { id: 'yesterday', label: 'Ontem' },
    { id: 'week', label: 'Últimos 7 dias' },
    { id: 'month', label: 'Este Mês' },
    { id: 'last_month', label: 'Mês Anterior' },
    { id: 'year', label: 'Este Ano' },
    { id: 'custom', label: 'Personalizado' },
  ];

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || dateFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setDateFilter('all');
    setCustomRange({ start: '', end: '' });
  };

  return (
    <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6">
      {/* Search */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-slate-100"
        />
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto">
        {/* Date Filter */}
        <div className="relative flex-1 md:flex-none">
          <button
            onClick={() => setIsDateOpen(!isDateOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary transition-all text-sm font-bold text-slate-700 dark:text-slate-200"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="whitespace-nowrap">
                {dateOptions.find(o => o.id === dateFilter)?.label}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDateOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isDateOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDateOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-2">
                    {dateOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setDateFilter(option.id);
                          if (option.id !== 'custom') setIsDateOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 rounded-xl text-sm transition-all ${
                          dateFilter === option.id 
                            ? 'bg-primary/10 text-primary font-bold' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  
                  {dateFilter === 'custom' && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Início</label>
                        <input 
                          type="date" 
                          value={customRange.start}
                          onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary/20 outline-none dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Fim</label>
                        <input 
                          type="date" 
                          value={customRange.end}
                          onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-primary/20 outline-none dark:text-slate-100"
                        />
                      </div>
                      <button
                        onClick={() => setIsDateOpen(false)}
                        className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-lg shadow-primary/20"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Status Filter */}
        {showStatusFilter && (
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                filterStatus === 'all' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('included')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                filterStatus === 'included' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Válidos
            </button>
            <button
              onClick={() => setFilterStatus('excluded')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                filterStatus === 'excluded' ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Excluídos
            </button>
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
            title="Limpar Filtros"
          >
            <XCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Date Range Badge */}
      {dateFilter !== 'all' && (
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-full border border-emerald-100 dark:border-emerald-800">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
            {format(dateRange.start, 'dd/MM/yy')} - {format(dateRange.end, 'dd/MM/yy')}
          </span>
        </div>
      )}
    </div>
  );
}