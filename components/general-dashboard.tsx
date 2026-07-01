'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { supabase } from '@/lib/supabase';
import { calculateStats, DashboardStats } from '@/lib/data-utils';
import RankingTable from './ranking-table';
import Image from 'next/image';
import FilterBar from './filter-bar';
import { 
  Activity,
  MessageSquare, 
  Ticket, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Users,
  BarChart3,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trophy,
  LayoutGrid,
  Maximize2,
  Columns,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Settings2,
  Save,
  Trash2,
  ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Sortable Item Component
function SortableItem({ 
  id, 
  children, 
  w, 
  h, 
  onWidthChange, 
  onHeightChange 
}: { 
  id: string, 
  children: React.ReactNode, 
  w: number,
  h: number,
  onWidthChange: (id: string, delta: number) => void,
  onHeightChange: (id: string, delta: number) => void
}) {
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
    '--col-span-md': Math.min(w, 6),
    '--col-span-lg': w,
    gridRow: `span ${h}`,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="group/item relative min-h-[100px] dashboard-widget">
      <div className="absolute top-3 left-3 flex flex-col items-start gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
        <div className="flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-xl">
          <div className="flex flex-col border-r border-slate-100 dark:border-slate-700 pr-1 mr-1">
            <button 
              onClick={() => onHeightChange(id, 1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
              title="Aumentar Altura"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
            <button 
              onClick={() => onHeightChange(id, -1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500"
              title="Diminuir Altura"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <button 
            onClick={() => onWidthChange(id, -1)}
            disabled={w <= 1}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-[9px] font-black px-1 min-w-[30px] text-center text-slate-400">{w}x{h}</span>
          <button 
            onClick={() => onWidthChange(id, 1)}
            disabled={w >= 12}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded disabled:opacity-30"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <button 
          {...attributes} 
          {...listeners}
          className="p-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg cursor-grab active:cursor-grabbing shadow-xl hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  );
}
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

interface GeneralDashboardProps {
  onSelectAgent?: (agent: any) => void;
}

export default function GeneralDashboard({ onSelectAgent }: GeneralDashboardProps) {
   const { 
     selectedRows,
     rawRows, 
     collaborators, 
     uploads, 
     filterStatus,
     dateFilter,
     dateRange,
     totalDashboard,
     odooTickets: contextOdooTickets,
     bitrixTickets: contextBitrixTickets,
     refreshData,
     dashboardLayout,
     dashboardLayouts,
     updateDashboardLayout,
     saveDashboardLayout,
     deleteDashboardLayout,
     selectDashboardLayout,
     selectedLayoutId,
     user
   } = useApp();

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');

  // Use totalDashboard from context for chat stats
  const chatStats = totalDashboard;
  const [odooStats, setOdooStats] = useState({ total: 0, expired: 0, near: 0, inProgress: 0 });
  const [odooTickets, setOdooTickets] = useState<any[]>([]);
  const [bitrixTickets, setBitrixTickets] = useState<any[]>([]);
  const [bitrixStats, setBitrixStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'wide'>('grid');
  
  // Widget State
  const defaultWidgets = [
    { id: 'kpi-total', w: 4, h: 2 },
    { id: 'kpi-chat', w: 2, h: 2 },
    { id: 'kpi-odoo', w: 2, h: 2 },
    { id: 'kpi-bitrix', w: 2, h: 2 },
    { id: 'kpi-evaluation-rate', w: 2, h: 2 },
    { id: 'chart-volume', w: 6, h: 4 },
    { id: 'chart-sources', w: 6, h: 4 },
    { id: 'ranking-table', w: 12, h: 8 },
  ];

  const [widgets, setWidgets] = useState(defaultWidgets);

  // Load saved layout when it changes in context
  useEffect(() => {
    if (dashboardLayout && Array.isArray(dashboardLayout) && dashboardLayout.length > 0) {
      setWidgets(dashboardLayout);
    }
  }, [dashboardLayout]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((i) => i.id === active.id);
      const newIndex = widgets.findIndex((i) => i.id === over.id);
      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      setWidgets(newWidgets);
      updateDashboardLayout(newWidgets);
    }
  };

  const handleWidthChange = (id: string, delta: number) => {
    const newWidgets = widgets.map(w => {
      if (w.id === id) {
        const newW = Math.max(1, Math.min(12, w.w + delta));
        return { ...w, w: newW };
      }
      return w;
    });
    setWidgets(newWidgets);
    updateDashboardLayout(newWidgets);
  };

  const handleHeightChange = (id: string, delta: number) => {
    const newWidgets = widgets.map(w => {
      if (w.id === id) {
        const newH = Math.max(1, Math.min(12, w.h + delta));
        return { ...w, h: newH };
      }
      return w;
    });
    setWidgets(newWidgets);
    updateDashboardLayout(newWidgets);
  };

  const resetLayout = () => {
    setWidgets(defaultWidgets);
    updateDashboardLayout(defaultWidgets);
  };

  const totalGeral = useMemo(() => {
    const chatTotal = chatStats?.totalAtendimentos || 0;
    const odooTotal = odooStats.total || 0;
    const bitrixTotal = bitrixStats.total || 0;
    return chatTotal + odooTotal + bitrixTotal;
  }, [chatStats, odooStats, bitrixStats]);

useEffect(() => {
     const fetchAllStats = async () => {
       setIsLoading(true);
       try {
         const { start, end } = dateRange;
         
         // Use selectedRows (already filtered by date) for Chat stats
         // selectedRows already contains only chat data filtered by date
         const chatData = selectedRows || [];
         
         // 1. Process Odoo Stats from selectedRows (unified table) - already filtered by date
         const uploadedOdoo = chatData.filter(row => row.source === 'odoo').map(r => ({
           id: r.id || `odoo-${Math.random()}`,
           stage: r.stage || r.rawData?.stage || 'Novo',
           sla_deadline: r.slaDeadline || r.rawData?.sla_deadline,
           created_at: r.data.toISOString(),
           assignee: r.colaborador || 'Não atribuído',
           client: r.cliente || 'N/A',
           source_file: r.sourceFile || 'Upload Direto',
           source: 'odoo'
         }));
         
         const combinedOdooData = uploadedOdoo;
         setOdooTickets(combinedOdooData);

         if (combinedOdooData.length > 0) {
           const now = new Date();
           const nextSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
           
           let expired = 0;
           let near = 0;
           let inProgress = 0;

           combinedOdooData.forEach(t => {
             const stage = (t.stage || '').toLowerCase();
             const isClosed = ['fechado', 'cancelado', 'concluído', 'done', 'closed', 'cancelled', 'resolvido', 'resolved', 'finalizado', 'finished'].includes(stage);
             
             if (!isClosed) {
               inProgress++;
               if (t.sla_deadline) {
                 const deadline = new Date(t.sla_deadline);
                 if (deadline < now) expired++;
                 else if (deadline <= nextSevenDays) near++;
               }
             }
           });

           setOdooStats({
             total: combinedOdooData.length,
             expired,
             near,
             inProgress
           });
         } else {
           setOdooStats({ total: 0, expired: 0, near: 0, inProgress: 0 });
         }

         // 2. Process Bitrix Stats - already filtered by date in selectedRows
         let combinedBitrixData: any[] = [];
         
         // Add data from uploaded Bitrix files (from support_data) - already filtered
         const uploadedBitrix = chatData.filter(row => row.source === 'bitrix').map(r => ({
           id: r.rawData?.id || `raw-bx-${Math.random().toString(36).substring(7)}`,
           title: r.rawData?.title || 'Ticket Uploadado',
           status: r.rawData?.status || 'closed',
           displayStatus: r.rawData?.display_status || 'Concluído',
           createdAt: r.data || r.rawData?.created_at || r.importedAt || new Date().toISOString(),
           assignee: r.colaborador || r.rawData?.assignee || 'Não atribuído',
           empresa: r.cliente || r.rawData?.client || 'N/A',
           source: 'bitrix'
         }));
         combinedBitrixData = [...uploadedBitrix];

         // Add Bitrix tickets from context (Supabase)
         const allBitrix = contextBitrixTickets || [];
         const mappedBitrix = allBitrix.map(t => ({
           ...t,
           source: 'bitrix',
           createdAt: t.created_at || t.imported_at || new Date(0).toISOString(),
           empresa: t.client || 'N/A',
           displayStatus: t.display_status || (t.status === 'resolved' ? 'Concluído' : 'Pendente')
         }));

         // Filter by date in memory
         const filteredBitrix = mappedBitrix.filter(t => {
           if (dateFilter === 'all') return true;
           const ticketDate = new Date(t.createdAt);
           return isWithinInterval(ticketDate, { start, end });
         });

         const existingBitrixIds = new Set(combinedBitrixData.map(t => t.id));
         const newBitrix = filteredBitrix.filter(t => !existingBitrixIds.has(t.id));
         combinedBitrixData = [...combinedBitrixData, ...newBitrix];

         setBitrixTickets(combinedBitrixData);
         
         if (combinedBitrixData.length > 0) {
           const stats = {
             total: combinedBitrixData.length,
             open: combinedBitrixData.filter((t: any) => t.status === 'open' || t.displayStatus === 'Pendente').length,
             inProgress: combinedBitrixData.filter((t: any) => t.status === 'in_progress' || t.displayStatus === 'Em Andamento').length,
             resolved: combinedBitrixData.filter((t: any) => t.status === 'resolved' || t.status === 'closed' || t.displayStatus === 'Concluído').length,
           };
           setBitrixStats(stats);
         } else {
           setBitrixStats({ total: 0, open: 0, inProgress: 0, resolved: 0 });
         }
       } catch (err) {
         console.error('General error in fetchAllStats:', err);
       } finally {
         setIsLoading(false);
       }
     };

     fetchAllStats();
   }, [dateRange, selectedRows, dateFilter, uploads, contextOdooTickets, contextBitrixTickets]);

  const chartData = useMemo(() => [
    { name: 'Chats', value: chatStats?.totalAtendimentos || 0, color: '#6366f1' },
    { name: 'Odoo', value: odooStats.total, color: '#8b5cf6' },
    { name: 'Bitrix', value: bitrixStats.total, color: '#ec4899' },
  ], [chatStats, odooStats, bitrixStats]);

  const filterOptions = [
    { id: 'all', label: 'Todo o Período' },
    { id: 'today', label: 'Hoje' },
    { id: 'yesterday', label: 'Ontem' },
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mês' },
    { id: 'last_month', label: 'Mês Anterior' },
    { id: 'year', label: 'Este Ano' },
    { id: 'custom', label: 'Personalizado' },
  ];

  if (isLoading && !chatStats) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse">Consolidando dados gerais...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Dashboard Geral</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Consolidado de Chat, Odoo e Bitrix filtrado por <span className="font-bold text-primary">&quot;Criado em&quot;</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 dark:border-slate-800 mr-1">
            Layouts
          </div>
          <select 
            className="bg-transparent text-xs font-bold outline-none px-2 py-1 text-slate-600 dark:text-slate-300"
            onChange={(e) => selectDashboardLayout(e.target.value)}
            value={selectedLayoutId || ''}
          >
            <option value="">Personalizado</option>
            {dashboardLayouts.map(l => (
              <option key={l.id} value={l.id}>{l.name} {l.is_default ? '(Padrão)' : ''}</option>
            ))}
          </select>
          
          <div className="flex items-center border-l border-slate-100 dark:border-slate-800 ml-1 pl-1 relative">
            <button
              onClick={() => {
                if (!user) {
                  alert('Você precisa estar logado para salvar layouts.');
                  return;
                }
                setIsSaveModalOpen(!isSaveModalOpen);
              }}
              className={`p-2 rounded-lg transition-all ${isSaveModalOpen ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary'}`}
              title="Salvar Layout Atual"
            >
              <Save className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isSaveModalOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50"
                >
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Salvar Layout</h4>
                  <input
                    type="text"
                    placeholder="Nome do layout..."
                    value={newLayoutName}
                    onChange={(e) => setNewLayoutName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsSaveModalOpen(false)}
                      className="flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        if (newLayoutName.trim()) {
                          saveDashboardLayout(newLayoutName.trim(), widgets);
                          setIsSaveModalOpen(false);
                          setNewLayoutName('');
                        }
                      }}
                      disabled={!newLayoutName.trim()}
                      className="flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      Salvar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button
              onClick={() => {
                if (selectedLayoutId) {
                  setIsDeleteConfirmOpen(!isDeleteConfirmOpen);
                } else {
                  console.warn('Selecione um layout salvo para excluir.');
                }
              }}
              className={`p-2 rounded-lg transition-all ${isDeleteConfirmOpen ? 'text-red-500 bg-red-500/10' : 'text-slate-400 hover:text-red-500'}`}
              title="Excluir Layout Selecionado"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isDeleteConfirmOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50"
                >
                  <h4 className="text-xs font-black uppercase tracking-widest text-red-500 mb-3">Excluir Layout?</h4>
                  <p className="text-[10px] text-slate-500 mb-4 font-bold">Esta ação não pode ser desfeita.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsDeleteConfirmOpen(false)}
                      className="flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                    >
                      Não
                    </button>
                    <button
                      onClick={() => {
                        if (selectedLayoutId) {
                          deleteDashboardLayout(selectedLayoutId);
                          setIsDeleteConfirmOpen(false);
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-500 text-white shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Sim, Excluir
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={resetLayout}
              className="p-2 rounded-lg text-slate-400 hover:text-primary transition-all"
              title="Resetar Layout"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <FilterBar showStatusFilter={false} placeholder="Buscar em todas as fontes..." />

      {/* Draggable Dashboard Grid */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6 grid-flow-dense auto-rows-[minmax(100px,auto)]">
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            {widgets.map((widget) => {
              if (widget.id === 'kpi-total') {
                return (
                  <SortableItem key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group relative overflow-hidden h-full flex flex-col justify-center"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-full -ml-12 -mb-12 blur-2xl group-hover:bg-blue-500/15 transition-all duration-700" />
                      
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shadow-sm ring-1 ring-primary/20">
                          <Activity className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter">
                          <TrendingUp className="w-2.5 h-2.5" />
                          Consolidado
                        </div>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5 relative z-10">Total de Registros</p>
                      <h3 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tighter relative z-10">{totalGeral.toLocaleString('pt-BR')}</h3>
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Todas as Fontes</div>
                        <div className="text-primary font-black text-xs">100%</div>
                      </div>
                    </motion.div>
                  </SortableItem>
                );
              }

              if (widget.id === 'kpi-evaluation-rate') {
                const totalAtendimentos = chatStats?.totalAtendimentos || 0;
                const totalEvaluations = collaborators?.reduce((sum, c) => sum + c.totalEvaluations, 0) || 0;
                const evaluationRate = totalAtendimentos > 0 ? (totalEvaluations / totalAtendimentos) * 100 : 0;
                const rateColor = evaluationRate >= 80 ? 'text-emerald-500' : evaluationRate >= 50 ? 'text-primary' : 'text-rose-500';
                const rateBgColor = evaluationRate >= 80 ? 'bg-emerald-500/10' : evaluationRate >= 50 ? 'bg-primary/10' : 'bg-rose-500/10';
                
                return (
                  <SortableItem key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group relative overflow-hidden h-full flex flex-col justify-center"
                    >
                      <div className={`absolute top-0 right-0 w-32 h-32 ${rateBgColor} rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700`} />
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className={`w-10 h-10 rounded-xl ${rateBgColor} flex items-center justify-center ${rateColor} shadow-sm ring-1 ring-current/20`}>
                          <ThumbsUp className="w-5 h-5" />
                        </div>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5 relative z-10">Taxa de Avaliações</p>
                      <h3 className={`text-4xl font-black ${rateColor} tracking-tighter relative z-10`}>{Math.round(evaluationRate)}%</h3>
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Avaliados</div>
                        <div className={`font-black text-xs ${rateColor}`}>{totalEvaluations} / {totalAtendimentos}</div>
                      </div>
                    </motion.div>
                  </SortableItem>
                );
              }

              if (widget.id.startsWith('kpi-')) {
                const source = widget.id.split('-')[1];
                const count = source === 'chat' ? (chatStats?.totalAtendimentos || 0) : source === 'odoo' ? odooStats.total : bitrixStats.total;
                const color = source === 'chat' ? 'text-blue-500' : source === 'odoo' ? 'text-emerald-500' : 'text-rose-500';
                const bgColor = source === 'chat' ? 'bg-blue-500/10' : source === 'odoo' ? 'bg-emerald-500/10' : 'bg-rose-500/10';
                const Icon = source === 'chat' ? MessageSquare : source === 'odoo' ? Database : Ticket;
                
                return (
                  <SortableItem key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group relative overflow-hidden h-full flex flex-col justify-center"
                    >
                      <div className={`absolute top-0 right-0 w-32 h-32 ${bgColor} rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700`} />
                      <div className="flex justify-between items-start mb-3 relative z-10">
                        <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center ${color} shadow-sm ring-1 ring-current/20`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{source}</div>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-0.5 relative z-10">Volume Total</p>
                      <h3 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tighter relative z-10">{count.toLocaleString('pt-BR')}</h3>
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Participação</div>
                        <div className={`${color} font-black text-xs`}>{totalGeral > 0 ? ((count / totalGeral) * 100).toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0,0'}%</div>
                      </div>
                    </motion.div>
                  </SortableItem>
                );
              }

              if (widget.id === 'chart-volume') {
                return (
                  <SortableItem key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Distribuição de Volume</h3>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Atendimentos por Canal</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <BarChart3 className="w-5 h-5 text-slate-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'var(--tooltip-bg)', 
                                borderRadius: '16px', 
                                border: '1px solid var(--tooltip-border)',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                color: 'var(--tooltip-color)'
                              }}
                              cursor={{ fill: 'var(--chart-cursor)' }}
                            />
                            <Bar 
                              dataKey="value" 
                              radius={[6, 6, 0, 0]}
                              barSize={widget.w > 4 ? 80 : 40}
                              className="transition-all duration-300"
                            >
                              {chartData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color} 
                                  className="hover:opacity-80 transition-opacity cursor-pointer"
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </SortableItem>
                );
              }

              if (widget.id === 'chart-sources') {
                return (
                  <SortableItem key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Mix de Fontes</h3>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Participação Percentual</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                          <Activity className="w-5 h-5 text-slate-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={widget.w > 4 ? 60 : 40}
                              outerRadius={widget.w > 4 ? 90 : 70}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'var(--tooltip-bg)', 
                                borderRadius: '16px', 
                                border: '1px solid var(--tooltip-border)',
                                color: 'var(--tooltip-color)'
                              }}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={36}
                              iconType="circle"
                              formatter={(value) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </SortableItem>
                );
              }

              if (widget.id === 'ranking-table') {
                return (
                  <SortableItem key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
                      <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">Ranking de Performance</h3>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Colaboradores em Destaque</p>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-xl">
                          <Trophy className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                      <div className="p-0 flex-1 overflow-auto">
                        <RankingTable onSelect={onSelectAgent || (() => {})} showRules={false} />
                      </div>
                    </div>
                  </SortableItem>
                );
              }

              return null;
            })}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}