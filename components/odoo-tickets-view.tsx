'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/app-context';
import { processOdooSpreadsheet } from '@/lib/data-utils';
import { apiGet, apiSend } from '@/lib/api-client';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Loader2, 
  Search, 
  Filter, 
  AlertCircle,
  Clock,
  User,
  Building2,
  Tag,
  CheckCircle2,
  Trash2,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  AlertTriangle,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';

import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

interface OdooTicket {
  id: string;
  dbId: string;
  priority: string;
  subject: string;
  team: string;
  assignee: string;
  client: string;
  sla_deadline: string | null;
  created_at: string | null;
  last_updated: string | null;
  properties: any;
  stage: string;
  link?: string;
  upload_id?: string;
  source_file?: string;
  imported_at?: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

export default function OdooTicketsView() {
  const { setOdooTicketsData, syncOdooTickets } = useApp();
  const [tickets, setTickets] = useState<OdooTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');
  const [customApiKey, setCustomApiKey] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const syncedTickets = await syncOdooTickets(customApiKey || undefined);
      setTickets(syncedTickets);
    } catch (err: any) {
      console.error('Erro ao sincronizar:', err);
      setError(err.message || 'Erro ao sincronizar com o Odoo.');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchTickets = useCallback(async () => {
    try {
      const { data } = await apiGet<{ data: any[] }>('/api/app-data/support-data?source=odoo');

      // Map support_data back to OdooTicket interface
      const mappedTickets: OdooTicket[] = (data || []).map((d: any) => {
          let odooId = d.raw_data?.id || 
                       d.raw_data?.properties?.id ||
                       d.raw_data?.['Sequência de IDs de chamados'] || 
                       d.raw_data?.['ID'] || 
                       d.raw_data?.['Sequência'] || 
                       d.raw_data?.['Ticket ID'] || 
                       d.raw_data?.['Id do chamado'] || 
                       d.raw_data?.['Referência'] || 
                       d.raw_data?.['Nº'] || 
                       d.raw_data?.['Protocolo'];

          const subject = d.raw_data?.name || d.raw_data?.subject || d.raw_data?.['Chamado'] || 'Sem Assunto';
          
          // Fallback: If ID is missing or looks like a UUID, try to extract from subject (#12345)
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(odooId));
          if (!odooId || isUuid || String(odooId).length > 15) {
            const match = subject.match(/\(#(\d+)\)/) || subject.match(/#(\d+)/);
            if (match) {
              const parenMatch = subject.match(/\(#(\d+)\)/);
              odooId = parenMatch ? parenMatch[1] : match[1];
            }
          }

          // If still a UUID, it's not a real Odoo ID
          const finalOdooId = (!odooId || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(odooId))) ? null : String(odooId);

          return {
            id: finalOdooId || 'Odoo',
            dbId: d.id,
            priority: d.raw_data?.priority || 'Média',
            subject: subject,
            team: d.raw_data?.team || 'Sem Equipe',
            assignee: d.colaborador || 'Não atribuído',
            client: d.cliente || 'N/A',
            sla_deadline: d.sla_deadline,
            created_at: d.data,
            last_updated: d.raw_data?.last_updated || null,
            properties: d.raw_data?.properties || null,
            stage: d.stage || 'Novo',
            link: d.raw_data?.link || (finalOdooId ? `https://systemsat.odoo.com/web#id=${finalOdooId}&model=helpdesk.ticket&view_type=form` : undefined),
            upload_id: d.upload_id,
            source_file: d.source_file,
            imported_at: d.imported_at
          };
        });
      setTickets(mappedTickets);
    } catch (err: any) {
      console.error('Erro ao buscar tickets do Odoo:', err);
      setError('Erro ao carregar os tickets salvos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      // Odoo returns dates in UTC (e.g., "2023-10-27 13:00:00")
      // When we create a new Date() from this string, JS might interpret it differently.
      // To ensure we handle the -3h offset for Brazil:
      let date = new Date(dateStr);
      
      // If the string doesn't have a timezone, append 'Z' to treat as UTC
      if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
        date = new Date(dateStr.replace(' ', 'T') + 'Z');
      }

      if (isNaN(date.getTime())) return dateStr;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  const processExcel = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const parsedTickets = await processOdooSpreadsheet(file);
      
      if (parsedTickets.length === 0) {
        throw new Error('Não foi possível encontrar tickets válidos na planilha.');
      }

      await setOdooTicketsData(parsedTickets, file.name);
      setTickets(parsedTickets);
    } catch (err: any) {
      console.error('Erro ao processar planilha:', err);
      setError(err.message || 'Erro ao processar o arquivo Excel.');
    } finally {
      setIsUploading(false);
    }
  }, [setOdooTicketsData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      processExcel(file);
    } else {
      setError('Por favor, envie um arquivo Excel (.xlsx, .xls) ou CSV.');
    }
  }, [processExcel]);

  const handleClearData = async () => {
    if (confirm('Tem certeza que deseja apagar todos os tickets do Odoo importados?')) {
      setIsLoading(true);
      try {
        await apiSend('/api/app-data/support-data?source=odoo', 'DELETE');
        setTickets([]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const stages = Array.from(new Set(tickets.map(t => t.stage).filter(Boolean)));

  const filteredTickets = tickets.filter(t => {
    const safeToLower = (val: any) => (val ? String(val).toLowerCase() : '');
    
    const matchesSearch = 
      safeToLower(t.subject).includes(searchTerm.toLowerCase()) ||
      safeToLower(t.id).includes(searchTerm.toLowerCase()) ||
      safeToLower(t.client).includes(searchTerm.toLowerCase()) ||
      safeToLower(t.assignee).includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || t.stage === stageFilter;

    return matchesSearch && matchesStage;
  });

  // Pagination Logic
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, stageFilter]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Dashboard Calculations
  const now = new Date();
  const stats = {
    total: tickets.length,
    inProgress: tickets.length, // Since we only sync active tickets now (non-Finalizado/Excluído)
    expiredSla: tickets.filter(t => t.sla_deadline && new Date(t.sla_deadline) < now).length,
    nearExpirySla: tickets.filter(t => {
      if (!t.sla_deadline) return false;
      const deadline = new Date(t.sla_deadline);
      const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours < 24 * 7;
    }).length
  };

  const ticketsByTeam = Array.from(
    tickets.reduce((acc, t) => {
      const team = t.team || 'Sem Equipe';
      acc.set(team, (acc.get(team) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const ticketsByAssignee = Array.from(
    tickets.reduce((acc, t) => {
      const assignee = t.assignee || 'Não Atribuído';
      acc.set(assignee, (acc.get(assignee) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const ticketsByStage = Array.from(
    tickets.reduce((acc, t) => {
      const stage = t.stage || 'Sem Estágio';
      acc.set(stage, (acc.get(stage) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const criticalTickets = tickets
    .filter(t => t.sla_deadline)
    .sort((a, b) => new Date(a.sla_deadline!).getTime() - new Date(b.sla_deadline!).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Tickets (Odoo)</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Dashboard e gestão de chamados do Odoo.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <input 
              type="password"
              placeholder="Chave API (Opcional)"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none w-40 focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-900 dark:text-slate-100"
              title="Insira a nova chave API se a atual expirou"
            />
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:opacity-90 transition-all whitespace-nowrap ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sincronizar
            </button>
          </div>
          {tickets.length > 0 && (
            <>
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex">
                <button 
                  onClick={() => setViewMode('dashboard')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    viewMode === 'dashboard' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Dashboard
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Lista
                </button>
              </div>
              <button 
                onClick={handleClearData}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl text-sm font-bold transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Limpar
              </button>
            </>
          )}
          <label className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all cursor-pointer">
            <UploadCloud className="w-4 h-4" />
            Importar
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {tickets.length === 0 ? (
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all ${
            isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/50'
          }`}
        >
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            {isUploading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <FileSpreadsheet className={`w-10 h-10 ${isDragging ? 'text-primary' : 'text-slate-400 dark:text-slate-600'}`} />
            )}
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">
            {isUploading ? 'Processando planilha...' : 'Importar Planilha do Odoo'}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-8">
            Arraste e solte o arquivo Excel (.xlsx) exportado do Odoo aqui, ou clique no botão abaixo para selecionar.
          </p>
          <label className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all cursor-pointer">
            <UploadCloud className="w-5 h-5" />
            Selecionar Arquivo
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0])}
              disabled={isUploading}
            />
          </label>
        </div>
      ) : viewMode === 'dashboard' ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total</span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.total}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tickets importados</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Em Aberto</span>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.inProgress}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Aguardando conclusão</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">SLA Expirado</span>
              </div>
              <div className="text-3xl font-black text-red-600 dark:text-red-400">{stats.expiredSla}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prazo ultrapassado</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Próximo ao Fim</span>
              </div>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.nearExpirySla}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Vence em até 7 dias</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tickets by Team */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Tickets por Equipe</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsByTeam} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 600 }}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 600 }}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <Tooltip 
                      cursor={{ fill: 'currentColor', opacity: 0.1 }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        color: 'var(--tooltip-text, #000)'
                      }}
                    />
                    <Bar dataKey="value" fill="#3713ec" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tickets by Stage */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <PieChartIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Distribuição por Estágio</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketsByStage}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {ticketsByStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        color: 'var(--tooltip-text, #000)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                {ticketsByStage.map((stage, index) => (
                  <div key={stage.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate" title={stage.name}>{stage.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">{stage.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Assignees */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">Tickets por Responsável</h3>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ticketsByAssignee} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600 }}
                      className="text-slate-500 dark:text-slate-400"
                      interval={0}
                      tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}...` : value}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 600 }}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <Tooltip 
                      cursor={{ fill: 'currentColor', opacity: 0.1 }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        color: 'var(--tooltip-text, #000)'
                      }}
                    />
                    <Bar dataKey="value" fill="#3713ec" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Critical SLAs */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">SLA Crítico</h3>
              </div>
              <div className="space-y-4">
                {criticalTickets.length > 0 ? criticalTickets.map(ticket => {
                  const isExpired = ticket.sla_deadline && new Date(ticket.sla_deadline) < now;
                  return (
                    <div key={ticket.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <a 
                        href={ticket.link || `https://systemsat.odoo.com/web#id=${ticket.id}&model=helpdesk.ticket&view_type=form`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                        title={ticket.subject}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-black text-primary uppercase">#{ticket.id}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                            isExpired ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
                          }`}>
                            {isExpired ? 'Expirado' : 'Urgente'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mb-2 group-hover:text-primary transition-colors">
                          {ticket.subject}
                        </div>
                      </a>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ticket.assignee || 'N/A'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(ticket.sla_deadline)}
                        </span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
                    Nenhum ticket com SLA definido.
                  </div>
                )}
              </div>
              {criticalTickets.length > 0 && (
                <button 
                  onClick={() => setViewMode('list')}
                  className="w-full mt-6 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-primary transition-colors border-t border-slate-100 dark:border-slate-800 pt-4"
                >
                  Ver todos os tickets
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar por ID, assunto, cliente ou responsável..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none text-slate-900 dark:text-slate-100"
              >
                <option value="all">Todos os Estágios</option>
                {stages.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Nº Chamado / Título</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Pessoa Responsável</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Estágio</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">Última Atualização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedTickets.map((ticket) => (
                    <tr key={ticket.dbId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <a 
                            href={ticket.link || `https://systemsat.odoo.com/web#id=${ticket.id}&model=helpdesk.ticket&view_type=form`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col"
                            title={ticket.subject}
                          >
                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-primary transition-colors">
                              <span className="text-primary font-bold mr-1">#{ticket.id}</span>
                              {ticket.subject || 'Sem assunto'}
                            </span>
                          </a>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-sm text-slate-900 dark:text-slate-100">{ticket.assignee || 'Não atribuído'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
                          {ticket.stage || 'Sem estágio'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {ticket.last_updated ? (
                            (() => {
                              let date = new Date(ticket.last_updated);
                              if (typeof ticket.last_updated === 'string' && !ticket.last_updated.includes('Z') && !ticket.last_updated.includes('+')) {
                                date = new Date(ticket.last_updated.replace(' ', 'T') + 'Z');
                              }
                              return isNaN(date.getTime()) ? ticket.last_updated : format(date, 'dd/MM/yyyy HH:mm');
                            })()
                          ) : formatDate(ticket.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                        Nenhum ticket encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Mostrando {Math.min(filteredTickets.length, (currentPage - 1) * pageSize + 1)} a {Math.min(filteredTickets.length, currentPage * pageSize)} de {filteredTickets.length} tickets
              </span>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center gap-1">
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
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentPage === pageNum 
                              ? 'bg-primary text-white shadow-md shadow-primary/20 dark:shadow-none' 
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}