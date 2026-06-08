'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/context/app-context';
import FilterBar from './filter-bar';
import { 
  Loader2, 
  AlertCircle, 
  Clock, 
  Users, 
  User, 
  ChevronDown, 
  ChevronRight,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight,
  BarChart3,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Filter,
  PieChart as PieChartIcon,
  Zap,
  Ticket
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
  Pie
} from 'recharts';
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  isWithinInterval,
  format
} from 'date-fns';

type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';

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
}

export default function OdooTicketsDashboard() {
  const { selectedRows, dateFilter } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Record<string, boolean>>({});
  const [expandedAssignees, setExpandedAssignees] = useState<Record<string, boolean>>({});

  const tickets = useMemo(() => {
    return selectedRows.filter(row => {
      if (row.source !== 'odoo') return false;
      return true;
    }).map(r => {
      // Try to find the original Odoo ID in rawData
      let odooId = r.rawData?.id || 
                   r.rawData?.properties?.id ||
                   r.rawData?.['Sequência de IDs de chamados'] || 
                   r.rawData?.['ID'] || 
                   r.rawData?.['Sequência'] || 
                   r.rawData?.['Ticket ID'] || 
                   r.rawData?.['Id do chamado'] || 
                   r.rawData?.['Referência'] || 
                   r.rawData?.['Nº'] || 
                   r.rawData?.['Protocolo'];

      const subject = r.rawData?.name || r.rawData?.subject || r.rawData?.['Chamado'] || 'Sem Assunto';
      
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
        dbId: r.id || `odoo-${Math.random()}`,
        priority: r.rawData?.priority || 'Média',
        subject: subject,
        team: r.rawData?.team || 'Sem Equipe',
        assignee: r.colaborador || 'Não atribuído',
        client: r.cliente || 'N/A',
        sla_deadline: r.slaDeadline ? r.slaDeadline.toISOString() : null,
        created_at: r.data.toISOString(),
        last_updated: r.rawData?.last_updated || null,
        properties: r.rawData?.properties || null,
        stage: r.stage || 'Novo',
        link: r.rawData?.link || (finalOdooId ? `https://systemsat.odoo.com/web#id=${finalOdooId}&model=helpdesk.ticket&view_type=form` : undefined)
      };
    });
  }, [selectedRows]);

  const stats = useMemo(() => {
    const now = new Date();
    const nextSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const inProgress = tickets.filter(t => {
      const stage = (t.stage || '').toLowerCase();
      return !['fechado', 'cancelado', 'concluído', 'done', 'closed', 'cancelled', 'resolvido', 'resolved', 'finalizado', 'finished'].includes(stage);
    });

    const expiredSLA = inProgress.filter(t => {
      if (!t.sla_deadline) return false;
      const deadline = new Date(t.sla_deadline);
      return deadline < now;
    });

    const nearSLA = inProgress.filter(t => {
      if (!t.sla_deadline) return false;
      const deadline = new Date(t.sla_deadline);
      return deadline >= now && deadline <= nextSevenDays;
    });

    // Group by team and assignee with SLA details
    const teamGroups: Record<string, { 
      total: number; 
      expired: number; 
      near: number;
      assignees: Record<string, {
        total: number;
        expired: number;
        near: number;
        tickets: OdooTicket[];
      }> 
    }> = {};

    inProgress.forEach(t => {
      const teamName = t.team || 'Sem Equipe';
      const assigneeName = t.assignee || 'Não Atribuído';

      if (!teamGroups[teamName]) {
        teamGroups[teamName] = { total: 0, expired: 0, near: 0, assignees: {} };
      }
      
      if (!teamGroups[teamName].assignees[assigneeName]) {
        teamGroups[teamName].assignees[assigneeName] = { total: 0, expired: 0, near: 0, tickets: [] };
      }

      const isExpired = t.sla_deadline && new Date(t.sla_deadline) < now;
      const isNear = t.sla_deadline && new Date(t.sla_deadline) >= now && new Date(t.sla_deadline) <= nextSevenDays;

      teamGroups[teamName].total++;
      if (isExpired) teamGroups[teamName].expired++;
      if (isNear) teamGroups[teamName].near++;

      const assignee = teamGroups[teamName].assignees[assigneeName];
      assignee.total++;
      if (isExpired) assignee.expired++;
      if (isNear) assignee.near++;
      assignee.tickets.push(t);
    });

    const chartData = Object.entries(teamGroups).map(([name, data]) => ({
      name,
      total: data.total
    })).sort((a, b) => b.total - a.total);

    const stageGroups: Record<string, number> = {};
    tickets.forEach(t => {
      const stage = t.stage || 'Sem Estágio';
      stageGroups[stage] = (stageGroups[stage] || 0) + 1;
    });

    const stageChartData = Object.entries(stageGroups).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    // Generate dynamic insights
    const insights = [];
    
    if (expiredSLA.length > 0) {
      const worstTeam = Object.entries(teamGroups).sort((a, b) => b[1].expired - a[1].expired)[0];
      if (worstTeam && worstTeam[1].expired > 0) {
        insights.push({
          type: 'warning',
          title: 'Atenção ao SLA',
          text: `A equipe "${worstTeam[0]}" possui ${worstTeam[1].expired} chamados com SLA vencido.`,
          icon: <AlertCircle className="w-5 h-5 text-red-500" />
        });
      }
    }

    if (inProgress.length > 0) {
      const busyAssignee = Object.entries(teamGroups).flatMap(([team, data]) => 
        Object.entries(data.assignees).map(([name, aData]) => ({ name, total: aData.total, team }))
      ).sort((a, b) => b.total - a.total)[0];

      if (busyAssignee && busyAssignee.total > 5) {
        insights.push({
          type: 'info',
          title: 'Carga de Trabalho',
          text: `${busyAssignee.name} (${busyAssignee.team}) está com ${busyAssignee.total} chamados ativos.`,
          icon: <Users className="w-5 h-5 text-blue-500" />
        });
      }
    }

    if (tickets.length > 0) {
      const resolvedCount = tickets.length - inProgress.length;
      const efficiency = Math.round((resolvedCount / tickets.length) * 100);
      insights.push({
        type: 'success',
        title: 'Eficiência de Resolução',
        text: `Taxa de conclusão de ${efficiency}% no período selecionado.`,
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      });
    }

    return {
      total: tickets.length,
      inProgress: inProgress.length,
      expiredSLA: expiredSLA.length,
      nearSLA: nearSLA.length,
      teamGroups,
      chartData,
      stageChartData,
      insights,
      lastUpdates: [...tickets].sort((a, b) => {
        const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0;
        const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 2),
      criticalTickets: [...expiredSLA, ...nearSLA].sort((a, b) => {
        if (!a.sla_deadline) return 1;
        if (!b.sla_deadline) return -1;
        return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
      }).slice(0, 10)
    };
  }, [tickets]);

  const toggleTeam = (team: string) => {
    setExpandedTeams(prev => ({ ...prev, [team]: !prev[team] }));
  };

  const toggleAssignee = (team: string, assignee: string) => {
    const key = `${team}-${assignee}`;
    setExpandedAssignees(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  const filterOptions = [
    { id: 'all', label: 'Todo o Período' },
    { id: 'today', label: 'Hoje' },
    { id: 'yesterday', label: 'Ontem' },
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mês' },
    { id: 'year', label: 'Este Ano' },
    { id: 'custom', label: 'Personalizado' },
  ];

  if (isLoading && tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Carregando métricas do Odoo...</p>
      </div>
    );
  }

  if (tickets.length === 0 && !error) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-700" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Sem dados para exibir</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
          Nenhum ticket do Odoo foi encontrado. Por favor, realize uma importação na página de Tickets (Odoo).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Dashboard de Chamados</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Visão analítica e monitoramento de SLAs do Odoo.</p>
        </div>
      </div>

      <FilterBar showStatusFilter={false} placeholder="Buscar chamados..." />

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Em Andamento" 
          value={stats.inProgress} 
          icon={<Clock className="w-6 h-6 text-blue-600" />}
          color="blue"
          subtitle="Chamados ativos"
        />
        <Card 
          title="SLA Vencido" 
          value={stats.expiredSLA} 
          icon={<AlertCircle className="w-6 h-6 text-red-600" />}
          color="red"
          subtitle="Ação imediata necessária"
          highlight={stats.expiredSLA > 0}
        />
        <Card 
          title="vence em até 7 dias" 
          value={stats.nearSLA} 
          icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
          color="amber"
          subtitle="Vencem em até 7 dias"
        />
        <Card 
          title="Total Importado" 
          value={stats.total} 
          icon={<Ticket className="w-6 h-6 text-slate-600" />}
          color="slate"
          subtitle="Base total de dados"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Team Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight">Distribuição por Equipe</h3>
              </div>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {Object.keys(stats.teamGroups).length} Equipes
              </span>
            </div>
            
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {Object.entries(stats.teamGroups)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([teamName, data]) => (
                <div key={teamName} className="group">
                  <button 
                    onClick={() => toggleTeam(teamName)}
                    className="w-full p-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-black text-sm group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {data.total}
                      </div>
                      <div className="text-left">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{teamName}</h4>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{Object.keys(data.assignees).length} responsáveis</span>
                          {data.expired > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
                              <AlertCircle className="w-2.5 h-2.5" />
                              {data.expired} vencidos
                            </span>
                          )}
                          {data.near > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {data.near} próximos
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedTeams[teamName] ? <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500" />}
                  </button>
                  
                  <AnimatePresence>
                    {expandedTeams[teamName] && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/30 dark:bg-slate-800/20"
                      >
                        <div className="px-6 pb-6 pt-2 space-y-3">
                          {Object.entries(data.assignees)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([assigneeName, assigneeData]) => {
                              const assigneeKey = `${teamName}-${assigneeName}`;
                              const isExpanded = expandedAssignees[assigneeKey];
                              
                              return (
                                <div key={assigneeName} className="space-y-2">
                                  <button 
                                    onClick={() => toggleAssignee(teamName, assigneeName)}
                                    className="w-full flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/30 transition-all"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                      </div>
                                      <div className="text-left">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{assigneeName}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400">{assigneeData.total} chamados</span>
                                          {assigneeData.expired > 0 && (
                                            <span className="text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                                              {assigneeData.expired} VENCIDOS
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                                  </button>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="pl-11 pr-2 pb-2 space-y-2">
                                          {assigneeData.tickets.map(ticket => {
                                            const isExpired = ticket.sla_deadline && new Date(ticket.sla_deadline) < new Date();
                                            return (
                                              <div key={ticket.dbId} className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-4 ${
                                                isExpired ? 'bg-red-50/30 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                                              }`}>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                    <a 
                                                      href={ticket.link || `https://systemsat.odoo.com/web#id=${ticket.id}&model=helpdesk.ticket&view_type=form`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-slate-600 dark:text-slate-400 font-medium truncate hover:text-primary transition-colors flex items-center gap-2"
                                                      title={ticket.subject}
                                                    >
                                                      <span className="font-black text-primary shrink-0">
                                                        #{ticket.id && !String(ticket.id).includes('-') ? ticket.id : 'Odoo'}
                                                      </span>
                                                      <span className="truncate">{ticket.subject}</span>
                                                    </a>
                                                  </div>
                                                  <div className="flex items-center gap-3 text-[10px]">
                                                    <span className="text-slate-500 dark:text-slate-400 font-medium">{ticket.stage}</span>
                                                    {ticket.sla_deadline && (
                                                      <span className={`flex items-center gap-1 ${isExpired ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        <Clock className="w-3 h-3" />
                                                        SLA: {formatDate(ticket.sla_deadline)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div className="shrink-0">
                                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    ticket.priority === 'Alta' || ticket.priority === 'Urgente' 
                                                      ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' 
                                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                  }`}>
                                                    {ticket.priority}
                                                  </span>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                Volume por Equipe
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: 'currentColor' }}
                    className="text-slate-500 dark:text-slate-400"
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: 'currentColor', opacity: 0.1 }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      color: 'var(--tooltip-text, #000)'
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={24}>
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3713ec' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stage Distribution Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight mb-6 flex items-center gap-3">
              <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-xl">
                <PieChartIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              Distribuição por Estágio
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.stageChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.stageChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {stats.stageChartData.slice(0, 6).map((stage, index) => (
                <div key={stage.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{stage.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{stage.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Critical SLAs & Updates */}
        <div className="space-y-6">
          {/* Last 2 Updates */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-900/10">
              <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                  <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Últimas Atualizações
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {stats.lastUpdates.length > 0 ? (
                stats.lastUpdates.map((ticket) => (
                  <div key={ticket.dbId} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/30 transition-all">
                    <a 
                      href={ticket.link || `https://systemsat.odoo.com/web#id=${ticket.id}&model=helpdesk.ticket&view_type=form`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 hover:text-primary transition-colors block"
                      title={ticket.subject}
                    >
                      <span className="text-primary mr-1">#{ticket.id}</span>
                      {ticket.subject}
                    </a>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        {ticket.assignee || 'N/A'}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{ticket.stage}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                  Nenhuma atualização recente.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                Alertas de SLA
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {stats.criticalTickets.length > 0 ? (
                stats.criticalTickets.map((ticket) => {
                  const isExpired = new Date(ticket.sla_deadline!) < new Date();
                  return (
                    <div key={ticket.dbId} className={`p-4 rounded-2xl border transition-all ${
                      isExpired ? 'bg-red-50/50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30'
                    }`}>
                    <a 
                      href={ticket.link || `https://systemsat.odoo.com/web#id=${ticket.id}&model=helpdesk.ticket&view_type=form`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2 hover:text-primary transition-colors block"
                      title={ticket.subject}
                    >
                      <span className="text-primary mr-1">#{ticket.id}</span>
                      {ticket.subject}
                    </a>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(ticket.sla_deadline)}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          {ticket.assignee || 'N/A'}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-200 dark:text-emerald-900/40 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Tudo em ordem!</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Nenhum SLA crítico no momento.</p>
                </div>
              )}
            </div>
            {stats.criticalTickets.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button className="w-full text-xs font-bold text-primary flex items-center justify-center gap-2 hover:underline">
                  Ver todos os alertas
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Actionable Insights */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <Lightbulb className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Insights Acionáveis
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {stats.insights.length > 0 ? (
                stats.insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800">
                    <div className="shrink-0 mt-1">
                      {insight.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{insight.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{insight.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400 dark:text-slate-500">Sem insights específicos para este período.</p>
                </div>
              )}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-black text-lg mb-2">Dica de Gestão</h3>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Utilize os filtros de período para identificar tendências sazonais e picos de demanda no suporte Odoo.
              </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <BarChart3 className="w-32 h-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

function Card({ title, value, icon, color, subtitle, highlight = false }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    slate: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${highlight ? 'ring-2 ring-red-500/20 border-red-100 dark:border-red-900/30' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{value}</span>
      </div>
      <div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
      </div>
    </motion.div>
  );
}