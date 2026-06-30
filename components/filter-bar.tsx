'use client';

import React, { useState } from 'react';
import { Search, Calendar, ChevronDown, XCircle, Filter, User } from 'lucide-react';
import { useApp } from '@/context/app-context';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface FilterBarProps {
  showStatusFilter?: boolean;
  placeholder?: string;
  showAdvancedFilters?: boolean;
}

export default function FilterBar({ showStatusFilter = true, placeholder = "Buscar...", showAdvancedFilters = false }: FilterBarProps) {
  const {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    dateFilter,
    setDateFilter,
    customRange,
    setCustomRange,
    dateRange,
    collaborators,
    selectedRows,
    columnFilters,
    setColumnFilter,
    clearColumnFilters
  } = useApp();

  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isCollaboratorOpen, setIsCollaboratorOpen] = useState(false);
  const [isClientOpen, setIsClientOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);

  const ratingOptions = [
    { value: 5, label: 'Avaliou positivo' },
    { value: 1, label: 'Avaliou negativo' },
    { value: 0, label: 'Não avaliou' }
  ];
  const [isMessagesOpen, setIsMessagesOpen] = useState(false);

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

  const hasActiveFilters = searchTerm || filterStatus !== 'all' || dateFilter !== 'all' ||
    columnFilters.collaborators.length > 0 || columnFilters.clients.length > 0 ||
    columnFilters.rating !== null || columnFilters.messagesMin !== null;

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setDateFilter('all');
    setCustomRange({ start: '', end: '' });
    clearColumnFilters();
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

        {/* Advanced Column Filters - Only shown on Raw Data View */}
        {showAdvancedFilters && (
          <>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-2">
              <div className="relative">
                <button
                  onClick={() => setIsCollaboratorOpen(!isCollaboratorOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-xs font-bold"
                >
                  <User className="w-3 h-3 text-primary" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {columnFilters.collaborators.length > 0 ? `${columnFilters.collaborators.length} colaborador(es)` : 'Colaborador'}
                  </span>
                  {columnFilters.collaborators.length > 0 && (
                    <span className="ml-1 bg-primary text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center">
                      {columnFilters.collaborators.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isCollaboratorOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsCollaboratorOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2"
                      >
                        <div className="space-y-1">
                          {collaborators.map((collab) => (
                            <label
                              key={collab.name}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={columnFilters.collaborators.includes(collab.name)}
                                onChange={() => {
                                  const newFilters = columnFilters.collaborators.includes(collab.name)
                                    ? columnFilters.collaborators.filter(n => n !== collab.name)
                                    : [...columnFilters.collaborators, collab.name];
                                  setColumnFilter('collaborators', newFilters);
                                }}
                                className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary w-3 h-3"
                              />
                              <span className="text-xs text-slate-700 dark:text-slate-300">{collab.name}</span>
                            </label>
                          ))}
                          {collaborators.length === 0 && (
                            <p className="text-xs text-slate-400 italic px-3 py-1">Nenhum colaborador encontrado</p>
                          )}
                        </div>
                        {columnFilters.collaborators.length > 0 && (
                          <button
                            onClick={() => setColumnFilter('collaborators', [])}
                            className="mt-2 w-full text-center text-[10px] text-rose-500 hover:underline"
                          >
                            Limpar seleção
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsClientOpen(!isClientOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-xs font-bold"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {columnFilters.clients.length > 0 ? `${columnFilters.clients.length} cliente(s)` : 'Cliente'}
                  </span>
                  {columnFilters.clients.length > 0 && (
                    <span className="ml-1 bg-primary text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center">
                      {columnFilters.clients.length}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {isClientOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsClientOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2"
                      >
                        <div className="space-y-1">
                          {Array.from(new Set(selectedRows.map(r => r.cliente).filter(Boolean)).values()).map((client) => (
                            <label
                              key={client}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={columnFilters.clients.includes(client)}
                                onChange={() => {
                                  const newFilters = columnFilters.clients.includes(client)
                                    ? columnFilters.clients.filter(n => n !== client)
                                    : [...columnFilters.clients, client];
                                  setColumnFilter('clients', newFilters);
                                }}
                                className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary w-3 h-3"
                              />
                              <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{client}</span>
                            </label>
                          ))}
                          {selectedRows.filter(r => r.cliente).length === 0 && (
                            <p className="text-xs text-slate-400 italic px-3 py-1">Nenhum cliente encontrado</p>
                          )}
                        </div>
                        {columnFilters.clients.length > 0 && (
                          <button
                            onClick={() => setColumnFilter('clients', [])}
                            className="mt-2 w-full text-center text-[10px] text-rose-500 hover:underline"
                          >
                            Limpar seleção
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsRatingOpen(!isRatingOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-xs font-bold"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {columnFilters.rating === 5 ? 'Positivo' : columnFilters.rating === 1 ? 'Negativo' : columnFilters.rating === 0 ? 'Sem av.' : 'Avaliação'}
                  </span>
                </button>

                <AnimatePresence>
                  {isRatingOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsRatingOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2"
                      >
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setColumnFilter('rating', 5)}
                            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-start gap-2 ${
                              columnFilters.rating === 5
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Avaliou positivo
                          </button>
                          <button
                            onClick={() => setColumnFilter('rating', 1)}
                            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-start gap-2 ${
                              columnFilters.rating === 1
                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Avaliou negativo
                          </button>
                          <button
                            onClick={() => setColumnFilter('rating', 0)}
                            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-start gap-2 ${
                              columnFilters.rating === 0
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            Não avaliou
                          </button>
                        </div>
                        {columnFilters.rating !== null && (
                          <button
                            onClick={() => setColumnFilter('rating', null)}
                            className="mt-2 w-full text-center text-[10px] text-rose-500 hover:underline"
                          >
                            Limpar
                          </button>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <button
                  onClick={() => setIsMessagesOpen(!isMessagesOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary transition-all text-xs font-bold"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {columnFilters.messagesMin ? `${columnFilters.messagesMin}+ msgs` : 'Mensagens'}
                  </span>
                </button>

                <AnimatePresence>
                  {isMessagesOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMessagesOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-3"
                      >
                        <input
                          type="number"
                          min="0"
                          placeholder="Mínimo"
                          value={columnFilters.messagesMin ?? ''}
                          onChange={(e) => setColumnFilter('messagesMin', e.target.value ? Number(e.target.value) : null)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-primary/20 outline-none dark:text-slate-100"
                        />
                        <button
                          onClick={() => setColumnFilter('messagesMin', null)}
                          className="mt-2 w-full text-center text-[10px] text-rose-500 hover:underline"
                        >
                          Limpar
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </>
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