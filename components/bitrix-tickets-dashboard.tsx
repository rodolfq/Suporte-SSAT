'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { 
  Ticket, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  Users, 
  BarChart3,
  Calendar,
  ChevronDown,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
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

export default function BitrixTicketsDashboard() {
  const { syncBitrixTickets } = useApp();
  const [tickets, setTickets] = useState<BitrixTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dateFilter, setDateFilter] = useState<string>('month');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'total' | 'resolved' | 'in_progress' | 'overdue'>('total');
  const [selectedAnalyst, setSelectedAnalyst] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState<'total' | 'resolved' | 'in_progress' | 'overdue' | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'resolved', direction: 'desc' });
  const [ticketSortConfig, setTicketSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleTicketSort = (key: string) => {
    setTicketSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const fetchTickets = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // We fetch all recent tickets (up to 1000) without date filters
      // to ensure "In Progress" and "Overdue" counts are always current.
      // Filtering for "Resolved" and charts will be done in the frontend.
      const params = new URLSearchParams({
        limit: '1000'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`/api/tickets?${params}`, { 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.tickets) {
          setTickets(data.tickets);
        } else if (data.error) {
          setError(data.error);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Erro ao buscar tickets (${response.status})`);
      }
    } catch (error: any) {
      console.error("Error fetching tickets for dashboard:", error);
      if (error.name === 'AbortError') {
        setError("A requisição demorou muito tempo. Tente novamente.");
      } else {
        setError("Erro ao carregar dados. Verifique sua conexão.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncBitrixTickets();
      await fetchTickets();
    } catch (error) {
      console.error("Error syncing tickets:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const stats = useMemo(() => {
    // 1. Calculate the start date for the current filter
    const now = new Date();
    const filterStartDate = new Date();
    if (dateFilter === 'today') filterStartDate.setHours(0, 0, 0, 0);
    else if (dateFilter === 'week') {
      const day = filterStartDate.getDay();
      filterStartDate.setDate(filterStartDate.getDate() - day);
      filterStartDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'month') {
      filterStartDate.setDate(1);
      filterStartDate.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'year') {
      filterStartDate.setMonth(0, 1);
      filterStartDate.setHours(0, 0, 0, 0);
    } else {
      filterStartDate.setFullYear(2000); // "All" - far in the past
    }

    // 2. Global stats (Summary Cards)
    // Resolved and Total respect the filter
    // In Progress and Overdue are ALWAYS current (unfiltered)
    const resolved = tickets.filter(t => {
      const isResolved = t.status === 'resolved' || t.status === 'closed';
      const isWithinFilter = new Date(t.createdAt) >= filterStartDate;
      return isResolved && isWithinFilter;
    }).length;

    const totalInPeriod = tickets.filter(t => new Date(t.createdAt) >= filterStartDate).length;

    const inProgress = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;
    
    // Overdue: Tickets with displayStatus "Atrasada" (unfiltered)
    const overdue = tickets.filter(t => 
      (t.status !== 'resolved' && t.status !== 'closed') && 
      t.displayStatus === 'Atrasada'
    ).length;

    // Avg Resolution Time (in days) - for the filtered period
    const resolvedTicketsInPeriod = tickets.filter(t => 
      (t.status === 'resolved' || t.status === 'closed') && 
      t.createdAt && t.updatedAt &&
      new Date(t.createdAt) >= filterStartDate
    );
    
    const totalResolutionTime = resolvedTicketsInPeriod.reduce((acc, t) => {
      const start = new Date(t.createdAt).getTime();
      const end = new Date(t.updatedAt).getTime();
      return acc + (end - start);
    }, 0);
    
    const avgResolutionTime = resolvedTicketsInPeriod.length > 0 
      ? (totalResolutionTime / resolvedTicketsInPeriod.length) / (1000 * 60 * 60 * 24) 
      : 0;

    // Ranking
    const analystMap = new Map<string, { name: string, avatar: string | null, resolved: number, inProgress: number, open: number, overdue: number, total: number, totalTime: number, timeCount: number }>();
    
    tickets.forEach(t => {
      const name = t.assignee || 'Não atribuído';
      const current = analystMap.get(name) || { name, avatar: t.assigneeAvatar || null, resolved: 0, inProgress: 0, open: 0, overdue: 0, total: 0, totalTime: 0, timeCount: 0 };
      
      const isResolved = t.status === 'resolved' || t.status === 'closed';
      const isOverdue = t.displayStatus === 'Atrasada';
      const isInProgress = !isResolved;
      const isWithinFilter = new Date(t.createdAt) >= filterStartDate;

      // "Andamento" and "Vencidos" ignore the filter
      if (isInProgress) {
        current.inProgress++;
        current.open++;
      }
      if (isOverdue) {
        current.overdue++;
      }

      // "Resolved" and "Total" respect the filter
      if (isWithinFilter) {
        current.total++;
        if (isResolved) {
          current.resolved++;
          if (t.createdAt && t.updatedAt) {
            const start = new Date(t.createdAt).getTime();
            const end = new Date(t.updatedAt).getTime();
            current.totalTime += (end - start);
            current.timeCount++;
          }
        }
      }
      
      analystMap.set(name, current);
    });

    const ranking = Array.from(analystMap.values())
      .map(a => ({
        ...a,
        avgTime: a.timeCount > 0 ? (a.totalTime / a.timeCount) / (1000 * 60 * 60 * 24) : 0
      }))
      .sort((a, b) => {
        const key = sortConfig.key as keyof typeof a;
        const valA = a[key];
        const valB = b[key];
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortConfig.direction === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        
        return sortConfig.direction === 'asc' 
          ? (valA as number) - (valB as number) 
          : (valB as number) - (valA as number);
      });

    const topAnalyst = ranking.length > 0 ? ranking[0] : null;

    const filteredTickets = tickets.filter(t => {
      // First filter by status (global or sub-filter)
      const currentFilter = (selectedAnalyst && subFilter) ? subFilter : activeFilter;
      
      let statusMatch = true;
      if (currentFilter === 'resolved') statusMatch = t.status === 'resolved' || t.status === 'closed';
      else if (currentFilter === 'in_progress') statusMatch = t.status !== 'resolved' && t.status !== 'closed';
      else if (currentFilter === 'overdue') statusMatch = (t.status !== 'resolved' && t.status !== 'closed') && t.displayStatus === 'Atrasada';
      
      if (!statusMatch) return false;

      // Then filter by selected analyst if any
      if (selectedAnalyst) {
        const name = t.assignee || 'Não atribuído';
        if (name !== selectedAnalyst) return false;
      }

      // Finally, if it's NOT inProgress or overdue, respect the date filter
      // (Because Resolved and Total should respect the filter)
      const isResolved = t.status === 'resolved' || t.status === 'closed';
      if (isResolved && new Date(t.createdAt) < filterStartDate) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const key = ticketSortConfig.key as keyof typeof a;
      const valA = a[key] || '';
      const valB = b[key] || '';
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return ticketSortConfig.direction === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      
      return ticketSortConfig.direction === 'asc' 
        ? (valA as any) - (valB as any) 
        : (valB as any) - (valA as any);
    });

    const formatTime = (days: number) => {
      if (days === 0) return '0m';
      const totalMinutes = days * 24 * 60;
      
      if (totalMinutes < 60) {
        return `${Math.round(totalMinutes)}m`;
      }
      
      const hours = totalMinutes / 60;
      if (hours < 24) {
        return `${hours.toFixed(1).replace('.0', '')}h`;
      }
      
      return `${days.toFixed(1).replace('.0', '')}d`;
    };

    return {
      total: totalInPeriod,
      resolved,
      inProgress,
      open: inProgress,
      overdue,
      avgResolutionTime,
      ranking,
      topAnalyst,
      filteredTickets,
      formatTime
    };
  }, [tickets, dateFilter, activeFilter, selectedAnalyst, subFilter, sortConfig, ticketSortConfig]);

  const chartData = [
    { name: 'Resolvidos', value: stats.resolved, color: '#10b981' },
    { name: 'Em Andamento', value: stats.inProgress - stats.overdue, color: '#f59e0b' },
    { name: 'Vencidos', value: stats.overdue, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444'];
  
  const handleAnalystClick = (analystName: string, filter: 'total' | 'resolved' | 'in_progress' | 'overdue' | null = null) => {
    if (selectedAnalyst === analystName && subFilter === filter) {
      setSelectedAnalyst(null);
      setSubFilter(null);
    } else {
      setSelectedAnalyst(analystName);
      setSubFilter(filter);
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando análise de tickets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-6 bg-white dark:bg-slate-900 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm p-12 text-center">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Erro ao carregar dados</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            {error}
          </p>
        </div>
        <button 
          onClick={() => fetchTickets()}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-12 text-center">
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
          <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Nenhum ticket encontrado</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto">
            Sincronize com o Bitrix para visualizar a análise de produtividade e ranking dos analistas.
          </p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Sincronizar Agora
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Análise de Tickets Bitrix</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Visão geral de produtividade e prazos.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>
                {dateFilter === 'all' ? 'Todo o Período' : 
                 dateFilter === 'today' ? 'Hoje' :
                 dateFilter === 'week' ? 'Esta Semana' :
                 dateFilter === 'month' ? 'Este Mês' : 'Este Ano'}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl z-20 p-2">
                  {['all', 'today', 'week', 'month', 'year'].map((f) => (
                    <button
                      key={f}
                      onClick={() => { setDateFilter(f); setIsFilterOpen(false); }}
                      className={`w-full text-left px-4 py-2 rounded-xl text-sm ${dateFilter === f ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      {f === 'all' ? 'Todo o Período' : f === 'today' ? 'Hoje' : f === 'week' ? 'Esta Semana' : f === 'month' ? 'Este Mês' : 'Este Ano'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button 
          onClick={() => { setActiveFilter('total'); setSelectedAnalyst(null); setSubFilter(null); }}
          className={`text-left p-5 rounded-3xl border transition-all ${activeFilter === 'total' && !selectedAnalyst ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-md ring-2 ring-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeFilter === 'total' && !selectedAnalyst ? 'bg-blue-500 text-white' : 'bg-blue-50 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400'}`}>
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total</p>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.total}</h3>
        </button>

        <button 
          onClick={() => { setActiveFilter('resolved'); setSelectedAnalyst(null); setSubFilter(null); }}
          className={`text-left p-5 rounded-3xl border transition-all ${activeFilter === 'resolved' && !selectedAnalyst ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 shadow-md ring-2 ring-emerald-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeFilter === 'resolved' && !selectedAnalyst ? 'bg-emerald-500 text-white' : 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-500 dark:text-emerald-400'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Resolvidos</p>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.resolved}</h3>
          <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
            {stats.total > 0 ? ((stats.resolved / stats.total) * 100).toFixed(1) : 0}%
          </p>
        </button>

        <button 
          onClick={() => { setActiveFilter('in_progress'); setSelectedAnalyst(null); setSubFilter(null); }}
          className={`text-left p-5 rounded-3xl border transition-all ${activeFilter === 'in_progress' && !selectedAnalyst ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 shadow-md ring-2 ring-amber-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeFilter === 'in_progress' && !selectedAnalyst ? 'bg-amber-500 text-white' : 'bg-amber-50 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Em Andamento</p>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.inProgress}</h3>
          <p className="text-[9px] text-amber-600 dark:text-amber-400 font-bold mt-1">
            Ativos no momento
          </p>
        </button>

        <button 
          onClick={() => { setActiveFilter('overdue'); setSelectedAnalyst(null); setSubFilter(null); }}
          className={`text-left p-5 rounded-3xl border transition-all ${activeFilter === 'overdue' && !selectedAnalyst ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 shadow-md ring-2 ring-red-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <div className="flex justify-between items-start mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeFilter === 'overdue' && !selectedAnalyst ? 'bg-red-500 text-white' : 'bg-red-50 dark:bg-red-900/40 text-red-500 dark:text-red-400'}`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Vencidos</p>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.overdue}</h3>
          <p className="text-[9px] text-red-600 dark:text-red-400 font-bold mt-1">
            Atrasados
          </p>
        </button>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tempo Médio</p>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">{stats.formatTime(stats.avgResolutionTime)}</h3>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">
            Resolução
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Status dos Tickets</h3>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    color: 'var(--tooltip-text, #000)'
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ranking Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Ranking de Analistas</h3>
            </div>
            
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
              <input 
                type="text"
                placeholder="Filtrar analista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20 transition-all dark:text-slate-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      Analista
                      {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center group cursor-pointer hover:text-primary transition-colors relative" onClick={() => handleSort('total')}>
                    <div className="flex items-center justify-center gap-1">
                      Total
                      {sortConfig.key === 'total' && (sortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Clique para filtrar ou ordenar</div>
                  </th>
                  <th className="px-4 py-3 text-center group cursor-pointer hover:text-primary transition-colors relative" onClick={() => handleSort('resolved')}>
                    <div className="flex items-center justify-center gap-1">
                      Resolvidos
                      {sortConfig.key === 'resolved' && (sortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Clique para filtrar ou ordenar</div>
                  </th>
                  <th className="px-4 py-3 text-center group cursor-pointer hover:text-primary transition-colors relative" onClick={() => handleSort('inProgress')}>
                    <div className="flex items-center justify-center gap-1">
                      Andamento
                      {sortConfig.key === 'inProgress' && (sortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Clique para filtrar ou ordenar</div>
                  </th>
                  <th className="px-4 py-3 text-center group cursor-pointer hover:text-primary transition-colors relative" onClick={() => handleSort('overdue')}>
                    <div className="flex items-center justify-center gap-1">
                      Vencidos
                      {sortConfig.key === 'overdue' && (sortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                    </div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[8px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Clique para filtrar ou ordenar</div>
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('avgTime')}>
                    <div className="flex items-center justify-end gap-1">
                      Tempo Médio
                      {sortConfig.key === 'avgTime' && (sortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {stats.ranking
                  .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((analyst, index) => (
                    <tr 
                      key={analyst.name} 
                      className={`group transition-colors ${selectedAnalyst === analyst.name && !subFilter ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50'}`}
                    >
                      <td 
                        className="px-4 py-4 cursor-pointer"
                        onClick={() => handleAnalystClick(analyst.name)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`relative ${selectedAnalyst === analyst.name && !subFilter ? 'ring-2 ring-primary ring-offset-2 rounded-full' : ''}`}>
                            {analyst.avatar ? (
                              <Image 
                                src={analyst.avatar} 
                                alt={analyst.name} 
                                width={32}
                                height={32}
                                referrerPolicy="no-referrer" 
                                className="w-8 h-8 rounded-full object-cover border border-slate-100 dark:border-slate-700" 
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                {analyst.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </div>
                            )}
                          </div>
                          <span className={`font-bold ${selectedAnalyst === analyst.name && !subFilter ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{analyst.name}</span>
                        </div>
                      </td>
                      <td 
                        className={`px-4 py-4 text-center cursor-pointer transition-all ${selectedAnalyst === analyst.name && subFilter === 'total' ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black ring-1 ring-inset ring-blue-200 dark:ring-blue-800' : 'text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        onClick={() => handleAnalystClick(analyst.name, 'total')}
                      >
                        {analyst.total}
                      </td>
                      <td 
                        className={`px-4 py-4 text-center cursor-pointer transition-all ${selectedAnalyst === analyst.name && subFilter === 'resolved' ? 'bg-emerald-50 dark:bg-emerald-900/40 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        onClick={() => handleAnalystClick(analyst.name, 'resolved')}
                      >
                        <span className={`px-2 py-1 rounded-lg font-bold text-xs ${selectedAnalyst === analyst.name && subFilter === 'resolved' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'}`}>
                          {analyst.resolved}
                        </span>
                      </td>
                      <td 
                        className={`px-4 py-4 text-center cursor-pointer transition-all ${selectedAnalyst === analyst.name && subFilter === 'in_progress' ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-black ring-1 ring-inset ring-amber-200 dark:ring-amber-800' : 'text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        onClick={() => handleAnalystClick(analyst.name, 'in_progress')}
                      >
                        {analyst.inProgress}
                      </td>
                      <td 
                        className={`px-4 py-4 text-center cursor-pointer transition-all ${selectedAnalyst === analyst.name && subFilter === 'overdue' ? 'bg-red-50 dark:bg-red-900/40 ring-1 ring-inset ring-red-200 dark:ring-red-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        onClick={() => handleAnalystClick(analyst.name, 'overdue')}
                      >
                        <span className={`px-2 py-1 rounded-lg font-bold text-xs ${selectedAnalyst === analyst.name && subFilter === 'overdue' ? 'bg-red-500 text-white' : (analyst.overdue > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600')}`}>
                          {analyst.overdue}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                        {stats.formatTime(analyst.avgTime)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ticket List */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Lista de Tickets: {activeFilter === 'total' ? 'Todos' : activeFilter === 'resolved' ? 'Resolvidos' : activeFilter === 'in_progress' ? 'Em Andamento' : 'Vencidos'}
                {selectedAnalyst && <span className="text-primary ml-2"> — Analista: {selectedAnalyst}</span>}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mostrando {stats.filteredTickets.length} tickets</p>
            </div>
          </div>
          {selectedAnalyst && (
            <button 
              onClick={() => setSelectedAnalyst(null)}
              className="text-xs font-bold text-primary hover:underline"
            >
              Limpar Filtro de Analista
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleTicketSort('id')}>
                  <div className="flex items-center gap-1">
                    ID
                    {ticketSortConfig.key === 'id' && (ticketSortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleTicketSort('title')}>
                  <div className="flex items-center gap-1">
                    Título
                    {ticketSortConfig.key === 'title' && (ticketSortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleTicketSort('empresa')}>
                  <div className="flex items-center gap-1">
                    Empresa
                    {ticketSortConfig.key === 'empresa' && (ticketSortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleTicketSort('assignee')}>
                  <div className="flex items-center gap-1">
                    Analista
                    {ticketSortConfig.key === 'assignee' && (ticketSortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                  </div>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-primary transition-colors" onClick={() => handleTicketSort('status')}>
                  <div className="flex items-center gap-1">
                    Status
                    {ticketSortConfig.key === 'status' && (ticketSortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleTicketSort('createdAt')}>
                  <div className="flex items-center justify-end gap-1">
                    Criação
                    {ticketSortConfig.key === 'createdAt' && (ticketSortConfig.direction === 'asc' ? <ArrowUpRight className="w-2 h-2" /> : <ArrowDownRight className="w-2 h-2" />)}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {stats.filteredTickets.slice(0, 50).map((ticket) => (
                <tr key={ticket.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-4 font-mono text-xs text-slate-400 dark:text-slate-500">#{ticket.id}</td>
                  <td className="px-4 py-4">
                    <a 
                      href={`https://systemsat.bitrix24.com.br/page/suporte/suporte_2/type/1086/details/${ticket.id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-slate-700 dark:text-slate-300 line-clamp-1 hover:text-primary hover:underline transition-colors"
                    >
                      {ticket.title}
                    </a>
                  </td>
                  <td className="px-4 py-4 text-slate-500 dark:text-slate-400">{ticket.empresa}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {ticket.assigneeAvatar ? (
                        <Image 
                          src={ticket.assigneeAvatar} 
                          alt={ticket.assignee || 'Avatar'} 
                          width={20}
                          height={20}
                          referrerPolicy="no-referrer" 
                          className="w-5 h-5 rounded-full object-cover" 
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400 dark:text-slate-500">
                          {ticket.assignee?.substring(0, 1) || '?'}
                        </div>
                      )}
                      <span className="text-xs text-slate-600 dark:text-slate-400">{ticket.assignee || 'Não atribuído'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                      ticket.displayStatus === 'Atrasada' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                      ticket.status === 'resolved' || ticket.status === 'closed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                      ticket.status === 'in_progress' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {ticket.displayStatus || ticket.status}
                    </span>
                    {ticket.displayStatus === 'Atrasada' && ticket.deadline && (
                      <div className="text-[9px] text-red-500 mt-1 font-medium">
                        Venceu em: {new Date(ticket.deadline).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-400 dark:text-slate-500 text-xs">
                    {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.filteredTickets.length > 50 && (
            <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs italic">
              Mostrando os primeiros 50 tickets. Use os filtros acima para refinar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}