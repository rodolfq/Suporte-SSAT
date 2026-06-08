'use client';

import React from 'react';
import Image from 'next/image';
import { useApp } from '@/context/app-context';
import dynamic from 'next/dynamic';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar, Legend 
} from 'recharts';
import FilterBar from './filter-bar';
import { TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Users, MessageSquare, Clock, Timer, Search, X, GripVertical, Info, Calendar, ChevronDown } from 'lucide-react';
import { generateInsights, calculateStats } from '@/lib/data-utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

type DateFilterType = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { CollaboratorStats } from '@/lib/data-utils';

interface DashboardProps {
  filteredCollaborators?: CollaboratorStats[];
  onViewRanking?: () => void;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
      >
        <GripVertical className="w-4 h-4 text-slate-400" />
      </div>
      {children}
    </div>
  );
}

export default function Dashboard({ filteredCollaborators, onViewRanking }: DashboardProps) {
  const { 
    collaborators: allCollaborators, 
    dashboard: globalDashboard, 
    selectedRows, 
    uploads,
    dateFilter,
    dateRange
  } = useApp();
  const [showAllCustomers, setShowAllCustomers] = React.useState(false);
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [customerSort, setCustomerSort] = React.useState<'evaluations' | 'name' | 'rate'>('evaluations');
  const [customerSortOrder, setCustomerSortOrder] = React.useState<'asc' | 'desc'>('desc');
  
  const [widgetOrder, setWidgetOrder] = React.useState(['kpis', 'insights', 'charts1', 'hourly', 'evaluations', 'speed', 'top5']);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const collaborators = filteredCollaborators || allCollaborators;

  // Recalculate dashboard stats if filtered
  const dashboard = React.useMemo(() => {
    if (!filteredCollaborators || filteredCollaborators.length === 0 || !globalDashboard) {
      return globalDashboard;
    }
    
    const filteredNames = new Set(filteredCollaborators.map(c => c.name));
    const filteredRows = (selectedRows || []).filter(r => filteredNames.has(r.colaborador));
    
    if (filteredRows.length === 0) return globalDashboard;
    
    const { dashboard: filteredDash } = calculateStats(filteredRows);
    return filteredDash;
  }, [filteredCollaborators, globalDashboard, selectedRows]);

  const sortedCustomers = React.useMemo(() => {
    if (!dashboard) return [];
    return [...dashboard.allCustomers].sort((a, b) => {
      let comparison = 0;
      if (customerSort === 'evaluations') comparison = a.totalEvaluations - b.totalEvaluations;
      else if (customerSort === 'rate') comparison = a.responseRate - b.responseRate;
      else if (customerSort === 'name') comparison = a.name.localeCompare(b.name);
      
      return customerSortOrder === 'desc' ? -comparison : comparison;
    });
  }, [dashboard, customerSort, customerSortOrder]);

  if (!dashboard) return null;

  const insights = generateInsights(collaborators, dashboard);

  // Chart Data Preparation
  const barData = [...collaborators]
    .sort((a, b) => b.totalAtendimentos - a.totalAtendimentos)
    .slice(0, 8)
    .map(c => ({
      name: c.name.split(' ')[0],
      atendimentos: c.totalAtendimentos
    }));

  const rankingData = [...collaborators]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      score: parseFloat(c.score.toFixed(1))
    }));

  const colors = ['#3713ec', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const leftCustomers = sortedCustomers.slice(0, 5);
  const rightCustomers = sortedCustomers.slice(5, 10);

  const getHeader = (isLeft: boolean) => {
    const isDesc = customerSortOrder === 'desc';
    if (customerSort === 'evaluations') return (isLeft === isDesc) ? 'Mais Avaliadores' : 'Menos Avaliadores';
    if (customerSort === 'rate') return (isLeft === isDesc) ? 'Maior Taxa' : 'Menor Taxa';
    return isLeft ? 'Início da Lista' : 'Continuação';
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Header with Period Info */}
      <div className="relative p-8 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group mb-2">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-all duration-1000" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Análise de Performance</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                Análise baseada no campo <span className="font-bold text-primary">&quot;Criado em&quot;</span> das planilhas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-primary shadow-sm border border-slate-200 dark:border-slate-800">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período Ativo</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Sincronizado</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FilterBar placeholder="Buscar atendimentos..." />

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <strong className="dark:text-blue-100">Sobre o Score:</strong> O Score é uma porcentagem (0-100%) normalizada com base no total de pontos. O agente com a maior pontuação no período atinge 100%.
        </div>
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={widgetOrder}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-8">
            {widgetOrder.map((id) => {
              if (id === 'kpis') {
                return (
                  <SortableItem key={id} id={id}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total de Atendimentos</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{dashboard.totalAtendimentos.toLocaleString()}</h3>
        </div>

        <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border ${dashboard.avgResponseTime <= 1 ? 'border-emerald-100 dark:border-emerald-900/20' : 'border-orange-100 dark:border-orange-900/20'} shadow-sm`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-2 ${dashboard.avgResponseTime <= 1 ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'} rounded-xl`}>
              <Clock className="w-5 h-5" />
            </div>
            <span className={`${dashboard.avgResponseTime <= 1 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'} text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-full`}>
              {dashboard.avgResponseTime <= 1 ? 'Excelente' : 'Alerta'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tempo Inicial de Resposta</p>
          <h3 className={`text-2xl font-bold mt-1 ${dashboard.avgResponseTime <= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>{(dashboard.avgResponseTime ?? 0).toFixed(1)} min</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Meta: 1 min</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-purple-100 dark:border-purple-900/20 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
              <Timer className="w-5 h-5" />
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-full">Time</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Média 1ª Resposta (Time)</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{(globalDashboard?.avgResponseTime || 0).toFixed(1)} min</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Média global da equipe</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ThumbsUp className="w-5 h-5" />
            </div>
            <div className="flex gap-0.5 text-emerald-500 dark:text-emerald-400 font-bold text-xs items-center">
              <ThumbsUp className="w-3 h-3" /> {(dashboard.avgRating ?? 0).toFixed(1)}
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Avaliação Média</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{(dashboard.avgRating ?? 0).toFixed(1)} / 5</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Baseado em {selectedRows.length} atendimentos</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-emerald-500 dark:text-emerald-400 text-xs font-bold px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full">+2 novos</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Equipe Ativa</p>
          <h3 className="text-2xl font-bold mt-1 text-slate-900 dark:text-slate-100">{dashboard.totalCollaborators} Agentes</h3>
          <div className="flex -space-x-2 mt-2">
            {collaborators.slice(0, 4).map((c, i) => (
              <div key={i} className="relative">
                {c.avatarUrl ? (
                  <Image 
                    src={c.avatarUrl} 
                    alt={c.name} 
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                    {c.name.charAt(0)}
                  </div>
                )}
              </div>
            ))}
              {collaborators.length > 4 && (
                <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                  +{collaborators.length - 4}
                </div>
              )}
          </div>
            </div>
          </div>
        </SortableItem>
      );
    }

      if (id === 'insights') {
        return (
          <SortableItem key={id} id={id}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {insights.map((insight, i) => (
                <div key={i} className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 p-4 rounded-xl flex items-start gap-3">
                  <div className="bg-primary text-white p-2 rounded-lg shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{insight}</p>
                </div>
              ))}
            </div>
          </SortableItem>
        );
      }

      if (id === 'charts1') {
  return (
    <SortableItem key={id} id={id}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0">

        {/* Atendimentos por colaborador */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px] flex flex-col min-w-0">
          <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-slate-100">Atendimentos por Colaborador</h3>

          <div className="w-full h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
              <BarChart data={barData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />

                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />

                <Tooltip
                  cursor={{ fill: 'currentColor' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid var(--tooltip-border)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--tooltip-bg)',
                    color: 'var(--tooltip-color)'
                  }}
                  itemStyle={{ fontWeight: 'bold', color: 'var(--tooltip-color)' }}
                />

                <Bar
                  dataKey="atendimentos"
                  fill="#3713ec"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score de performance */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px] flex flex-col min-w-0">
          <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-slate-100">Score de Performance (Top 5)</h3>

          <div className="w-full h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
              <BarChart data={rankingData} layout="vertical">

                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800"
                />

                <XAxis
                  type="number"
                  hide
                />

                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  width={100}
                />

                <Tooltip
                  cursor={{ fill: 'currentColor' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid var(--tooltip-border)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'var(--tooltip-bg)',
                    color: 'var(--tooltip-color)'
                  }}
                  itemStyle={{ fontWeight: 'bold', color: 'var(--tooltip-color)' }}
                />

                <Bar
                  dataKey="score"
                  fill="#3713ec"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />

              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </SortableItem>
  );
}

      if (id === 'hourly') {
        return (
          <SortableItem key={id} id={id}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px] flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Volume de Chats por Horário</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>Horário de Brasília</span>
                </div>
              </div>

              <div className="w-full h-[280px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <LineChart data={dashboard.hourlyDistribution}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                    />
                    <XAxis
                      dataKey="hour"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(hour) => `${hour}h`}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid var(--tooltip-border)',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'var(--tooltip-bg)',
                        color: 'var(--tooltip-color)'
                      }}
                      itemStyle={{ fontWeight: 'bold', color: 'var(--tooltip-color)' }}
                      labelFormatter={(hour) => `Horário: ${hour}:00`}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3713ec"
                      strokeWidth={3}
                      dot={{ fill: '#3713ec', strokeWidth: 2, r: 4, stroke: 'currentColor', className: 'text-white dark:text-slate-900' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </SortableItem>
        );
      }

      if (id === 'evaluations') {
        return (
          <SortableItem key={id} id={id}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Analistas: Mais vs Menos Avaliados */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg mb-4 dark:text-slate-100">Volume de Avaliações por Analista</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Mais Avaliados</h4>
              {dashboard.topEvaluatedCollaborators.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{c.name}</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{c.totalEvaluations}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Menos Avaliados</h4>
              {dashboard.leastEvaluatedCollaborators.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{c.name}</span>
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">{c.totalEvaluations}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Clientes: Avaliação por Cliente */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Avaliação por Cliente</h3>
            <button 
              onClick={() => setShowAllCustomers(true)}
              className="text-primary text-xs font-bold hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{getHeader(true)}</h4>
              {leftCustomers.map((c, i) => (
                <div key={i} className="flex flex-col p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{c.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{c.totalEvaluations} Avaliações</span>
                  </div>
                  <div className="w-full bg-emerald-200 dark:bg-emerald-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 dark:bg-emerald-400 h-full" style={{ width: `${(c.totalEvaluations / Math.max(c.totalAtendimentos, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{getHeader(false)}</h4>
              {rightCustomers.map((c, i) => (
                <div key={i} className="flex flex-col p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{c.name}</span>
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300">{c.totalEvaluations} Avaliações</span>
                  </div>
                  <div className="w-full bg-rose-200 dark:bg-rose-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-rose-600 dark:bg-rose-400 h-full" style={{ width: `${(c.totalEvaluations / Math.max(c.totalAtendimentos, 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SortableItem>
  );
}

      if (id === 'speed') {
        return (
          <SortableItem key={id} id={id}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-slate-100">Velocidade de Início de Atendimento (Tempo Inicial)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Início Mais Rápido (Média)</h4>
              <div className="space-y-2">
                {dashboard.fastestStarters.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{(c.avgResponseTime ?? 0).toFixed(1)} min</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Início Mais Lento (Média)</h4>
              <div className="space-y-2">
                {dashboard.slowestStarters.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-800 flex items-center justify-center text-rose-700 dark:text-rose-300 font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                    </div>
                    <span className="text-sm font-bold text-rose-700 dark:text-rose-300">{(c.avgResponseTime ?? 0).toFixed(1)} min</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SortableItem>
    );
  }

      if (id === 'top5') {
        return (
          <SortableItem key={id} id={id}>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Top 5 Performers</h3>
          <button 
            onClick={onViewRanking}
            className="text-primary text-sm font-bold hover:underline"
          >
            Ver ranking completo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="pb-4 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Agente</th>
                <th className="pb-4 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Pontos</th>
                <th className="pb-4 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  Score
                </th>
                <th className="pb-4 text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider text-right">Atendimentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {collaborators.slice(0, 5).map((c, i) => (
                <tr key={i} className="group">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-400 dark:text-slate-600 w-4">{i + 1}</span>
                      {c.avatarUrl ? (
                        <Image 
                          src={c.avatarUrl} 
                          alt={c.name} 
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold text-xs">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className={`text-sm font-bold ${c.totalPoints >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {c.totalPoints > 0 ? `+${c.totalPoints}` : c.totalPoints}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${c.score}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{(c.score ?? 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-4 text-right font-medium text-slate-600 dark:text-slate-400">{c.totalAtendimentos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SortableItem>
  );
}

    return null;
  })}
</div>
        </SortableContext>
      </DndContext>

      {/* All Customers Modal */}
      <AnimatePresence>
        {showAllCustomers && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllCustomers(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Todos os Clientes</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Lista completa de engajamento por cliente</p>
                </div>
                <button 
                  onClick={() => setShowAllCustomers(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none dark:text-slate-100"
                  />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                  <button 
                    onClick={() => {
                      if (customerSort === 'evaluations') setCustomerSortOrder(customerSortOrder === 'asc' ? 'desc' : 'asc');
                      else { setCustomerSort('evaluations'); setCustomerSortOrder('desc'); }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${customerSort === 'evaluations' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    Avaliações {customerSort === 'evaluations' && (customerSortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button 
                    onClick={() => {
                      if (customerSort === 'rate') setCustomerSortOrder(customerSortOrder === 'asc' ? 'desc' : 'asc');
                      else { setCustomerSort('rate'); setCustomerSortOrder('desc'); }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${customerSort === 'rate' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    Taxa % {customerSort === 'rate' && (customerSortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                  <button 
                    onClick={() => {
                      if (customerSort === 'name') setCustomerSortOrder(customerSortOrder === 'asc' ? 'desc' : 'asc');
                      else { setCustomerSort('name'); setCustomerSortOrder('asc'); }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${customerSort === 'name' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    Nome {customerSort === 'name' && (customerSortOrder === 'asc' ? '↑' : '↓')}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dashboard.allCustomers
                    .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()))
                    .sort((a, b) => {
                      let comparison = 0;
                      if (customerSort === 'evaluations') comparison = a.totalEvaluations - b.totalEvaluations;
                      else if (customerSort === 'rate') comparison = a.responseRate - b.responseRate;
                      else if (customerSort === 'name') comparison = a.name.localeCompare(b.name);
                      
                      return customerSortOrder === 'desc' ? -comparison : comparison;
                    })
                    .map((c, i) => (
                      <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary/20 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300 truncate pr-2">{c.name}</span>
                          <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {(c.responseRate ?? 0).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-500" 
                            style={{ width: `${c.responseRate}%` }} 
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                          <span>{c.totalAtendimentos} Atendimentos</span>
                          <span>{c.totalEvaluations} Avaliações</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}