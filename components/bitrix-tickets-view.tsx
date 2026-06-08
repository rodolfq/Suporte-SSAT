'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Search, Filter, Clock, CheckCircle2, AlertCircle, MoreHorizontal, RefreshCw, ChevronLeft, ChevronRight, X, Calendar, ChevronDown } from 'lucide-react';
import { useApp } from '@/context/app-context';

interface BitrixTicket {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  displayStatus?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  empresa: string;
  createdAt: string;
  updatedAt: string;
  assignee?: string;
  assigneeAvatar?: string | null;
}

// Mock data for now
const MOCK_TICKETS: BitrixTicket[] = [
  {
    id: '1042',
    title: 'Erro ao emitir nota fiscal',
    status: 'open',
    priority: 'high',
    empresa: 'Empresa ABC Ltda',
    createdAt: '2026-03-17T08:30:00Z',
    updatedAt: '2026-03-17T08:30:00Z',
  },
  {
    id: '1041',
    title: 'Dúvida sobre integração com ERP',
    status: 'in_progress',
    priority: 'medium',
    empresa: 'Comércio XYZ',
    createdAt: '2026-03-16T14:20:00Z',
    updatedAt: '2026-03-17T09:15:00Z',
    assignee: 'Ana Silva',
  },
  {
    id: '1040',
    title: 'Sistema lento na tela de relatórios',
    status: 'resolved',
    priority: 'high',
    empresa: 'Indústria Beta',
    createdAt: '2026-03-15T10:00:00Z',
    updatedAt: '2026-03-16T16:45:00Z',
    assignee: 'Carlos Santos',
  },
  {
    id: '1039',
    title: 'Solicitação de novo usuário',
    status: 'closed',
    priority: 'low',
    empresa: 'Serviços Omega',
    createdAt: '2026-03-14T09:00:00Z',
    updatedAt: '2026-03-14T11:30:00Z',
    assignee: 'Ana Silva',
  },
  {
    id: '1038',
    title: 'Falha no login via SSO',
    status: 'open',
    priority: 'urgent',
    empresa: 'Tech Solutions',
    createdAt: '2026-03-17T09:45:00Z',
    updatedAt: '2026-03-17T09:45:00Z',
  }
];

export default function BitrixTicketsView() {
  const { syncBitrixTickets, error: globalError, clearError } = useApp();
  const [tickets, setTickets] = useState<BitrixTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFilter !== 'all' && { dateFilter }),
        ...(dateFilter === 'custom' && customRange.start && { startDate: customRange.start }),
        ...(dateFilter === 'custom' && customRange.end && { endDate: customRange.end }),
      });

      const response = await fetch(`/api/tickets?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.tickets) {
          setTickets(data.tickets);
          setTotalPages(data.pagination.totalPages);
          setTotalItems(data.pagination.total);
        } else {
          setTickets(MOCK_TICKETS);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch tickets:", errorData.error || response.statusText);
        setTickets(MOCK_TICKETS);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setTickets(MOCK_TICKETS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, statusFilter, dateFilter, customRange]);

  const handleSync = async () => {
    setIsSyncing(true);
    setLocalError(null);
    if (clearError) clearError();
    
    try {
      await syncBitrixTickets();
      await fetchTickets();
    } catch (error: any) {
      console.error("Error syncing tickets:", error);
      setLocalError(error.message || "Erro ao sincronizar com o Bitrix. Verifique a conexão e as tabelas do banco.");
    } finally {
      setIsSyncing(false);
    }
  };

  // We no longer filter locally since the API handles it
  const filteredTickets = tickets;

  const getStatusColor = (status: BitrixTicket['status'], displayStatus?: string) => {
    if (displayStatus === 'Atrasada') return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/30';
    switch (status) {
      case 'open': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/30';
      case 'in_progress': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30';
      case 'resolved': return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30';
      case 'closed': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusLabel = (status: BitrixTicket['status'], displayStatus?: string) => {
    if (displayStatus) return displayStatus;
    switch (status) {
      case 'open': return 'Aberto';
      case 'in_progress': return 'Em Andamento';
      case 'resolved': return 'Resolvido';
      case 'closed': return 'Fechado';
      default: return status;
    }
  };

  const getPriorityIcon = (priority: BitrixTicket['priority']) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'low': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getPriorityLabel = (priority: BitrixTicket['priority']) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
    }
  };

  return (
    <div className="space-y-6">
      {(localError || globalError) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-2xl flex items-center gap-3 text-sm"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Erro na Sincronização</p>
            <p className="opacity-90">{localError || globalError}</p>
          </div>
          <button 
            onClick={() => { setLocalError(null); if (clearError) clearError(); }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Tickets (Bitrix)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Sincronização de chamados para futuro cruzamento com atendimentos.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>
                {dateFilter === 'all' ? 'Todo o Período' : 
                 dateFilter === 'today' ? 'Hoje' :
                 dateFilter === 'yesterday' ? 'Ontem' :
                 dateFilter === 'week' ? 'Esta Semana' :
                 dateFilter === 'month' ? 'Este Mês' :
                 dateFilter === 'year' ? 'Este Ano' : 'Personalizado'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-20 p-2 overflow-hidden"
                  >
                    {[
                      { id: 'all', label: 'Todo o Período' },
                      { id: 'today', label: 'Hoje' },
                      { id: 'yesterday', label: 'Ontem' },
                      { id: 'week', label: 'Esta Semana' },
                      { id: 'month', label: 'Este Mês' },
                      { id: 'year', label: 'Este Ano' },
                      { id: 'custom', label: 'Personalizado' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setDateFilter(item.id as any);
                          if (item.id !== 'custom') setIsFilterOpen(false);
                          setPage(1);
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-colors ${
                          dateFilter === item.id 
                            ? 'bg-primary/10 text-primary font-bold' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                    {dateFilter === 'custom' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Início</label>
                          <input 
                            type="date" 
                            value={customRange.start}
                            onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fim</label>
                          <input 
                            type="date" 
                            value={customRange.end}
                            onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <button 
                          onClick={() => setIsFilterOpen(false)}
                          className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-sm hover:bg-primary/90 transition-colors"
                        >
                          Aplicar Filtro
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          
          <div className="relative flex-1 sm:flex-none sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              placeholder="Buscar tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 dark:text-slate-100"
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-600 dark:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
          >
            <option value="">Todos os Status</option>
            <option value="open">Aberto</option>
            <option value="in_progress">Em Andamento</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Título</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Criado em</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Prioridade</th>
                <th className="px-6 py-4 font-semibold">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p>Carregando tickets...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    Nenhum ticket encontrado.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket, index) => (
                  <motion.tr 
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {ticket.id}
                    </td>
                    <td className="px-6 py-4 max-w-[300px]">
                      <a 
                        href={`https://systemsat.bitrix24.com.br/page/suporte/suporte_2/type/1086/details/${ticket.id}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis hover:text-primary hover:underline transition-colors block"
                      >
                        {ticket.title}
                      </a>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Atualizado em {new Date(ticket.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap max-w-[120px] truncate">
                      {ticket.empresa}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status, ticket.displayStatus)}`}>
                        {getStatusLabel(ticket.status, ticket.displayStatus)}
                      </span>
                      {ticket.displayStatus === 'Atrasada' && ticket.deadline && (
                        <div className="text-[10px] text-red-500 mt-1 font-medium">
                          Venceu em: {new Date(ticket.deadline).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {getPriorityIcon(ticket.priority)}
                        <span className="text-slate-600 dark:text-slate-400">{getPriorityLabel(ticket.priority)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                          {ticket.assigneeAvatar ? (
                            <Image 
                              src={ticket.assigneeAvatar} 
                              alt={ticket.assignee} 
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {ticket.assignee.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                          )}
                          <span>{ticket.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">Não atribuído</span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando <span className="font-medium">{(page - 1) * limit + 1}</span> a <span className="font-medium">{Math.min(page * limit, totalItems)}</span> de <span className="font-medium">{totalItems}</span> resultados
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Página {page} de {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}