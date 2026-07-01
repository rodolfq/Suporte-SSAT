'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQueue, QueueOperator, Operator } from '@/context/queue-context';
import { useApp } from '@/context/app-context';
import { 
  Check, 
  X, 
  GripVertical, 
  Plus, 
  Trash2, 
  Clock, 
  Calendar, 
  UserMinus, 
  UserPlus,
  Phone,
  MessageSquare,
  Shield,
  Coffee,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  History,
  ChevronLeft,
  ChevronRight,
  Settings2,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
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
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isToday, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Sortable Block Component for Layout
function SortableBlock({ 
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
    <div ref={setNodeRef} style={style} className="group/item relative flex flex-col min-h-0 dashboard-widget">
      <div className="absolute top-2 left-2 flex flex-col items-start gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
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

// Sortable Row Component
interface SortableRowProps {
  op: QueueOperator;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onCheck: (id: string, field: any, value: boolean) => void;
  onRemove: (id: string) => void;
  onLunchChange: (id: string, time: string) => void;
  onInfoChange: (id: string, field: 'atendimento_tipo' | 'atendimento_hora' | 'atendimento_obs', value: string) => void;
  onComplete: (id: string) => void;
  isShiftHandover: boolean;
}

function SortableRow({ op, index, isFirst, onRemove, onInfoChange, onComplete, isShiftHandover, onCheck, onLunchChange, lunchTimes, isReadOnly }: SortableRowProps & { lunchTimes: string[], isReadOnly?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: op.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1
  };

  const progress = useMemo(() => {
    if (!op.checklist) return 0;
    const fields = [op.checklist.vpn, op.checklist.ch_bitrix, op.checklist.ch_odoo, op.checklist.telefone, op.checklist.almoco];
    const completed = fields.filter(Boolean).length;
    return (completed / fields.length) * 100;
  }, [op.checklist]);

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className={`group border-b border-slate-100 dark:border-slate-800 transition-colors ${
        isFirst ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 
        isShiftHandover ? 'bg-orange-50/50 dark:bg-orange-900/10' : 
        'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      } ${isReadOnly ? 'pointer-events-none opacity-90' : ''}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className={`relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] ${
            isFirst ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' : 
            isShiftHandover ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 
            'bg-emerald-500 text-white'
          }`} title="Fila de Chamados">
            {index + 1}
            {isFirst && !isReadOnly && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-ping" />
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${op.operador?.status === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {op.operador?.nome}
              {isShiftHandover && (
                <span className="px-2 py-0.5 bg-purple-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm">
                  Passagem
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {op.operador?.horario_trabalho}
            </span>
            {op.operador?.posicao_fixa !== null && (
              <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1 py-0.2 rounded uppercase">
                {op.operador?.posicao_fixa}º Fixo
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1">
            {['vpn', 'ch_bitrix', 'ch_odoo', 'telefone', 'almoco'].map((field) => (
              <input 
                key={field}
                type="checkbox"
                disabled={isReadOnly}
                checked={(op.checklist as any)?.[field] || false}
                onChange={(e) => onCheck(op.id, field as any, e.target.checked)}
                className="w-3 h-3 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
                title={field.toUpperCase()}
              />
            ))}
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-emerald-400'}`}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <select 
          disabled={isReadOnly}
          value={op.almoco?.horario || ''}
          onChange={(e) => onLunchChange(op.id, e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-1 text-[9px] text-slate-700 dark:text-slate-300 outline-none w-16 disabled:opacity-50"
        >
          <option value="">-</option>
          {lunchTimes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td className="px-4 py-3">
        <select 
          disabled={isReadOnly}
          value={op.atendimento_tipo || 'Chamado'}
          onChange={(e) => onInfoChange(op.id, 'atendimento_tipo', e.target.value as any)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
        >
          <option value="Chamado">Chamado</option>
          <option value="Telefone">Telefone</option>
          <option value="Almoço">Almoço</option>
          <option value="Ausente">Ausente</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <input 
          type="text"
          disabled={isReadOnly}
          value={op.atendimento_hora || ''}
          onChange={(e) => onInfoChange(op.id, 'atendimento_hora', e.target.value)}
          placeholder="HH:mm"
          className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <input 
            type="text"
            disabled={isReadOnly}
            value={op.atendimento_obs || ''}
            onChange={(e) => onInfoChange(op.id, 'atendimento_obs', e.target.value)}
            placeholder="Observações..."
            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-50"
          />
          {!isReadOnly && (
            <input 
              type="checkbox"
              checked={false}
              onChange={(e) => {
                if (e.target.checked) {
                  onComplete(op.id);
                }
              }}
              className="w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 cursor-pointer"
              title="Marcar como concluído e ir para o final"
            />
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
      </td>
    </tr>
  );
}

export default function QueueDashboard() {
  const { 
    operators, 
    currentQueue, 
    currentQueueData,
    isLoading, 
    generateDailyQueue, 
    fetchCurrentQueue,
    updateQueueOrder, 
    updateChecklist, 
    updateLunch,
    updateInfo,
    updateOperatorStatus,
    updateOperatorSchedule,
    updateOperatorPosition,
    updateQueueHandover,
    addOperatorToQueue,
    removeOperatorFromQueue,
    schedules,
    updateSchedule,
    deleteSchedule,
    completeActivity,
    deleteActivity,
    activities,
    exportQueueReport,
    availableDates,
    fetchAvailableDates
  } = useQueue();

  const { queueLayout, updateQueueLayout } = useApp();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [reportStartDate, setReportStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<Operator | null>(null);
  const [absentUntil, setAbsentUntil] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [posicaoFixa, setPosicaoFixa] = useState<number | null>(null);
  const [isHandover, setIsHandover] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<'terca' | 'quarta' | 'presencial' | null>(null);
  const [scheduleNames, setScheduleNames] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');

  // Layout widgets
  const defaultWidgets = [
    { id: 'queue', w: 8, h: 4 },
    { id: 'checklist', w: 8, h: 4 },
    { id: 'lunch', w: 8, h: 4 },
    { id: 'history', w: 4, h: 4 },
    { id: 'operators', w: 4, h: 4 },
    { id: 'schedules', w: 4, h: 4 }
  ];

  const [widgets, setWidgets] = useState(defaultWidgets);

  useEffect(() => {
    if (queueLayout && Array.isArray(queueLayout) && queueLayout.length > 0) {
      setWidgets(queueLayout);
    }
  }, [queueLayout]);

  const isFutureDate = !isToday(selectedDate) && isAfter(selectedDate, new Date());
  const isPastDate = !isToday(selectedDate) && isBefore(selectedDate, startOfDay(new Date()));

  // Generate date ribbon days
  const ribbonDays = useMemo(() => {
    return Array.from({ length: 9 }).map((_, i) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - 4 + i);
      return d;
    });
  }, [selectedDate]);

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
      // Check if dragging a row in the queue table
      const activeOpIndex = currentQueue.findIndex((op) => op.id === active.id);
      const overOpIndex = currentQueue.findIndex((op) => op.id === over.id);

      if (activeOpIndex !== -1 && overOpIndex !== -1) {
        const newOrder = arrayMove(currentQueue, activeOpIndex, overOpIndex);
        updateQueueOrder(newOrder);
      } else {
        // Dragging a widget
        const oldIndex = widgets.findIndex((w) => w.id === active.id);
        const newIndex = widgets.findIndex((w) => w.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newWidgets = arrayMove(widgets, oldIndex, newIndex);
          setWidgets(newWidgets);
          updateQueueLayout(newWidgets);
        }
      }
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
    updateQueueLayout(newWidgets);
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
    updateQueueLayout(newWidgets);
  };

  const resetLayout = () => {
    setWidgets(defaultWidgets);
    updateQueueLayout(defaultWidgets);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportQueueReport(reportStartDate, reportEndDate);
      if (data.length === 0) {
        alert('Nenhum dado encontrado para o período selecionado.');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio_Fila");
      
      // Generate filename
      const filename = `Relatorio_Fila_${reportStartDate}_a_${reportEndDate}.xlsx`;
      XLSX.writeFile(workbook, filename);
      setShowReportModal(false);
    } catch (err) {
      console.error('Erro ao exportar:', err);
      alert('Erro ao exportar relatório.');
    } finally {
      setIsExporting(false);
    }
  };

  const assignedPositions = operators.map(op => op.posicao_fixa).filter((p): p is number => p !== null);
  let nextPos = 1;
  while (assignedPositions.includes(nextPos)) {
    nextPos++;
  }

  const handleStatusUpdate = async () => {
    if (!showStatusModal) return;
    
    const isReturning = showStatusModal.status === 'Ausente' && !absentUntil;
    
    await updateOperatorStatus(
      showStatusModal.id, 
      absentUntil ? 'Ausente' : 'Ativo', 
      absentUntil || null
    );
    if (workHours) {
      await updateOperatorSchedule(showStatusModal.id, workHours);
    }
    await updateOperatorPosition(showStatusModal.id, posicaoFixa);

    if (isHandover) {
      await updateQueueHandover(showStatusModal.id);
    } else if (currentQueueData?.responsavel_passagem_turno_id === showStatusModal.id) {
      await updateQueueHandover(null);
    }

    // Auto-add to queue if returning from absence today
    if (isReturning && isToday(selectedDate)) {
      const isInQueue = currentQueue.some(q => q.operador_id === showStatusModal.id);
      if (!isInQueue && currentQueueData) {
        await addOperatorToQueue(showStatusModal.id);
      }
    }

    setShowStatusModal(null);
    setAbsentUntil('');
    setWorkHours('');
    setPosicaoFixa(null);
  };

  const handleScheduleUpdate = async () => {
    if (!editingSchedule || !scheduleDate) return;
    await updateSchedule(editingSchedule, scheduleNames, scheduleDate);
    setEditingSchedule(null);
    setScheduleNames('');
    setScheduleDate('');
  };

  const lunchTimes = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00'];

  useEffect(() => {
    fetchCurrentQueue(format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate, fetchCurrentQueue]);

  useEffect(() => {
    fetchAvailableDates();
  }, [fetchAvailableDates]);

  useEffect(() => {
    if (currentQueue.length === 0 && (isToday(selectedDate) || isFutureDate) && !isLoading && !currentQueueData) {
      generateDailyQueue(selectedDate);
    }
  }, [currentQueue.length, selectedDate, isLoading, currentQueueData, generateDailyQueue, isFutureDate]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-8 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Fila de Atendimento</h1>
            {isPastDate && (
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1.5 border border-amber-200 dark:border-amber-800">
                <Shield className="w-3 h-3" />
                Modo Leitura: Histórico
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
              {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary/50 transition-all font-bold text-xs"
          >
            <History className="w-4 h-4" />
            Explorar Histórico
          </button>

          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 1))}
              className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="relative group/date border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <input 
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(year, month - 1, day));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer z-30 w-full h-full scale-[5] origin-center"
              />
              <div 
                className="relative z-10 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all h-full whitespace-nowrap min-w-[140px] flex items-center gap-2 justify-center group/btn pointer-events-none"
              >
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover/btn:bg-primary group-hover/btn:text-white transition-colors">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] text-slate-400 uppercase font-black mb-0.5">Data Consultada</span>
                  <span className="text-sm font-black">{isToday(selectedDate) ? "Hoje" : format(selectedDate, "dd 'de' MMM", { locale: ptBR })}</span>
                </div>
              </div>
            </div>

            {!isToday(selectedDate) && (
              <button 
                onClick={() => setSelectedDate(new Date())}
                className="px-4 py-2.5 text-[10px] font-black text-primary hover:bg-primary/5 uppercase transition-all flex flex-col items-center justify-center min-w-[70px] border-r border-slate-200 dark:border-slate-800"
                title="Voltar para Hoje"
              >
                <RefreshCw className="w-3.5 h-3.5 mb-1" />
                Voltar
              </button>
            )}
            
            <button 
              onClick={() => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1))}
              className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={() => {
              if (isPastDate) {
                fetchCurrentQueue(format(selectedDate, 'yyyy-MM-dd'));
              } else {
                generateDailyQueue(selectedDate);
              }
            }}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            title={isPastDate ? "Atualizar Visualização" : "Refatorar Fila (Aplica novas configurações)"}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          
          <button 
            onClick={resetLayout}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-primary transition-all"
            title="Resetar Layout"
          >
            <Settings2 className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setShowReportModal(true)}
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 font-bold text-sm px-4"
          >
            <FileText className="w-5 h-5" />
            <span>Relatório</span>
          </button>

          {currentQueue.length === 0 && (isToday(selectedDate) || isFutureDate) && (
            <button 
              onClick={() => generateDailyQueue(selectedDate)}
              className="bg-primary text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
            >
              <Plus className="w-5 h-5" />
              Gerar Fila
            </button>
          )}
        </div>
      </div>

      {/* Date Ribbon */}
      <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide -mx-2 px-2">
        {ribbonDays.map((date, idx) => {
          const active = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
          const dataExists = availableDates.includes(format(date, 'yyyy-MM-dd'));
          const today = isToday(date);
          
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center min-w-[70px] p-3 rounded-[1.5rem] transition-all relative ${
                active 
                ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-105' 
                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800 hover:border-primary/50'
              }`}
            >
              <span className={`text-[10px] font-black uppercase mb-1 ${active ? 'text-white/70' : 'text-slate-400'}`}>
                {format(date, 'EEE', { locale: ptBR })}
              </span>
              <span className="text-lg font-black leading-none">{format(date, 'dd')}</span>
              {today && !active && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-950" />
              )}
              {dataExists && !active && (
                <div className="w-1 h-1 bg-primary rounded-full mt-1.5" />
              )}
            </button>
          );
        })}
      </div>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8 grid-flow-dense auto-rows-[minmax(150px,auto)] pb-20">
          <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
            {widgets.map((widget) => {
              if (widget.id === 'queue') {
                return (
                  <SortableBlock key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
                      <div className="p-6 bg-blue-600 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold">Fila de Chamados</h3>
                            <p className="text-xs text-blue-100">Versão 3.2 • {currentQueue.length} operadores</p>
                          </div>
                        </div>
                        {!isPastDate && (
                          <button 
                            onClick={() => setShowAddModal(true)}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              <th className="px-4 py-3 w-16">#</th>
                              <th className="px-4 py-3">Analista</th>
                              <th className="px-4 py-3 w-24">Checklist</th>
                              <th className="px-4 py-3 w-20">Almoço</th>
                              <th className="px-4 py-3 w-32">Atendimento</th>
                              <th className="px-4 py-3 w-28">Hora</th>
                              <th className="px-4 py-3">Observações</th>
                            </tr>
                          </thead>
                          <tbody>
                            <SortableContext 
                              items={currentQueue.map(op => op.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {currentQueue.map((op, index) => (
                                <SortableRow 
                                  key={op.id} 
                                  op={op} 
                                  index={index}
                                  isFirst={index === 0}
                                  isLast={index === currentQueue.length - 1}
                                  onRemove={removeOperatorFromQueue}
                                  onInfoChange={updateInfo}
                                  onComplete={completeActivity}
                                  onCheck={updateChecklist}
                                  onLunchChange={updateLunch}
                                  lunchTimes={lunchTimes}
                                  isShiftHandover={currentQueueData?.responsavel_passagem_turno_id === op.operador_id}
                                  isReadOnly={isPastDate}
                                />
                              ))}
                            </SortableContext>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </SortableBlock>
                );
              }

              if (widget.id === 'checklist') {
                return (
                  <SortableBlock key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[300px]">
                      <div className="p-6 bg-emerald-600 text-white flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                          <Check className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold">Checklist de Tarefas Diárias</h3>
                          <p className="text-xs text-emerald-100">Definição manual por operador</p>
                        </div>
                      </div>
                      <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                          <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              <th className="px-4 py-3">Operador</th>
                              <th className="px-4 py-3 text-center">VPN</th>
                              <th className="px-4 py-3 text-center">CH. Bitrix</th>
                              <th className="px-4 py-3 text-center">CH. Odoo</th>
                              <th className="px-4 py-3 text-center">Telefone</th>
                              <th className="px-4 py-3 text-center">Almoço</th>
                              <th className="px-4 py-3">Progresso</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentQueue.map((op) => {
                              const progress = (() => {
                                if (!op.checklist) return 0;
                                const fields = [op.checklist.vpn, op.checklist.ch_bitrix, op.checklist.ch_odoo, op.checklist.telefone, op.checklist.almoco];
                                const completed = fields.filter(Boolean).length;
                                return (completed / fields.length) * 100;
                              })();

                              return (
                                <tr key={op.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">{op.operador?.nome}</td>
                                  {['vpn', 'ch_bitrix', 'ch_odoo', 'telefone', 'almoco'].map((field) => (
                                    <td key={field} className="px-4 py-3 text-center">
                                      <input 
                                        type="checkbox"
                                        disabled={isPastDate}
                                        checked={(op.checklist as any)?.[field] || false}
                                        onChange={(e) => updateChecklist(op.id, field as any, e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-white dark:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                      />
                                    </td>
                                  ))}
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${progress}%` }}
                                          className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                                        />
                                      </div>
                                      <span className="text-[10px] font-black text-slate-400">{Math.round(progress)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </SortableBlock>
                );
              }

              if (widget.id === 'lunch') {
                return (
                  <SortableBlock key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-6 h-full flex flex-col overflow-auto">
                      <div className="flex items-center gap-3 mb-6 bg-yellow-400 p-4 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-black">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-black">Fila - Almoço</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {lunchTimes.map(time => {
                          const opsAtTime = currentQueue.filter(op => op.almoco?.horario === time);
                          return (
                            <div key={time} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-black text-slate-900 dark:text-slate-100">{time}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">{opsAtTime.length}</span>
                                  {!isPastDate && (
                                    <select 
                                      onChange={(e) => {
                                        if (e.target.value) updateLunch(e.target.value, time);
                                        e.target.value = '';
                                      }}
                                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1 py-0.5 text-[8px] outline-none"
                                    >
                                      <option value="">+</option>
                                      {currentQueue
                                        .filter(op => !op.almoco?.horario)
                                        .map(op => (
                                          <option key={op.id} value={op.id}>{op.operador?.nome}</option>
                                        ))
                                      }
                                    </select>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2">
                                {opsAtTime.length > 0 ? opsAtTime.map(op => (
                                  <div key={op.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate mr-1">{op.operador?.nome}</span>
                                    {!isPastDate && (
                                      <button 
                                        onClick={() => updateLunch(op.id, '')}
                                        className="text-slate-400 hover:text-red-500 shrink-0"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                )) : (
                                  <div className="text-[10px] text-slate-400 italic py-2">Nenhum</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </SortableBlock>
                );
              }

              if (widget.id === 'history') {
                return (
                  <SortableBlock key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
                      <div className="p-6 bg-slate-800 text-white flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                          <History className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold">Histórico</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 uppercase font-black">Últimas do dia</span>
                            <div className="h-1 w-1 rounded-full bg-slate-300" />
                            <div className="relative overflow-hidden">
                              <input 
                                type="date"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const [year, month, day] = e.target.value.split('-').map(Number);
                                    setSelectedDate(new Date(year, month - 1, day));
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full scale-[3]"
                              />
                              <span className="text-[10px] text-primary underline font-bold pointer-events-none">
                                Ver outro dia
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Registros de dias anteriores</p>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {availableDates.filter(d => !isToday(parseISO(d + 'T12:00:00'))).slice(0, 10).map(dateStr => (
                            <button
                              key={dateStr}
                              onClick={() => {
                                const [y, m, d] = dateStr.split('-').map(Number);
                                setSelectedDate(new Date(y, m - 1, d));
                              }}
                              className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                format(selectedDate, 'yyyy-MM-dd') === dateStr 
                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-700 hover:border-primary/50'
                              }`}
                            >
                              {format(parseISO(dateStr + 'T12:00:00'), 'dd/MM')}
                            </button>
                          ))}
                          {availableDates.length === 0 && (
                            <span className="text-[10px] text-slate-400 italic">Sem registros anteriores</span>
                          ) /* Note: Only showing if no data at all */}
                        </div>
                      </div>
                      <div className="p-4 flex-1 overflow-y-auto space-y-3 scroll-smooth">
                        {activities.length > 0 ? activities.map((activity) => (
                          <div 
                            key={activity.id} 
                            className={`p-3 rounded-xl border transition-all ${
                              activity.tipo === 'Chamado' ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800' :
                              activity.tipo === 'Telefone' ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-800' :
                              'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                activity.tipo === 'Chamado' ? 'bg-emerald-100 text-emerald-600' :
                                activity.tipo === 'Telefone' ? 'bg-red-100 text-red-600' :
                                activity.tipo === 'Ausente' ? 'bg-orange-100 text-orange-600' :
                                'bg-slate-200 text-slate-500'
                              }`}>
                                {activity.tipo}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">{activity.horario}</span>
                                {!isPastDate && (
                                  <button 
                                    onClick={() => deleteActivity(activity.id)}
                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Excluir do histórico"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {activity.operador?.nome}
                              </span>
                              {activity.observacao && (
                                <p className={`text-[10px] mt-1 ${activity.tipo === 'Almoço' ? 'line-through text-slate-400' : 'text-slate-500'}`}>
                                  {activity.observacao}
                                </p>
                              )}
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-8 text-slate-400 italic text-xs">
                            Sem atividades
                          </div>
                        )}
                      </div>
                    </div>
                  </SortableBlock>
                );
              }

              if (widget.id === 'operators') {
                return (
                  <SortableBlock key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
                      <div className="p-6 bg-blue-600 text-white flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                          <Clock className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold">Horários</h3>
                      </div>
                      <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                        {operators.map(op => (
                          <button 
                            key={op.id} 
                            onClick={() => {
                              setShowStatusModal(op);
                              setAbsentUntil(op.ausente_ate || '');
                              setWorkHours(op.horario_trabalho || '');
                              setPosicaoFixa(op.posicao_fixa);
                              setIsHandover(currentQueueData?.responsavel_passagem_turno_id === op.id);
                            }}
                            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary/50 transition-all group"
                          >
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {op.nome}
                                </span>
                                {op.posicao_fixa !== null && (
                                  <span className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded uppercase">
                                    {op.posicao_fixa}º
                                  </span>
                                )}
                                {currentQueueData?.responsavel_passagem_turno_id === op.id && (
                                  <span className="text-[8px] font-black bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded uppercase">
                                    Passagem
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 uppercase font-black">{op.horario_trabalho}</span>
                            </div>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              op.status === 'Ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                            }`}>
                              {op.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </SortableBlock>
                );
              }

              if (widget.id === 'schedules') {
                return (
                  <SortableBlock key={widget.id} id={widget.id} w={widget.w} h={widget.h} onWidthChange={handleWidthChange} onHeightChange={handleHeightChange}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
                      <div className="bg-blue-600 text-white p-6 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <h3 className="font-bold uppercase tracking-widest">Presencial</h3>
                        </div>
                        {!isPastDate && (
                          <button 
                            onClick={() => {
                              setEditingSchedule('presencial');
                              setScheduleNames('');
                              setScheduleDate(format(new Date(), 'yyyy-MM-dd'));
                            }}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                              <th className="px-6 py-3">Data</th>
                              <th className="px-6 py-3">Analistas</th>
                              <th className="px-6 py-3 w-16"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(() => {
                              const sortedSchedules = [...schedules].sort((a, b) => a.data.localeCompare(b.data));
                              const todayStr = format(new Date(), 'yyyy-MM-dd');
                              const nextSchedule = sortedSchedules.find(s => s.data >= todayStr);
                              
                              return sortedSchedules.length > 0 ? sortedSchedules.map((s) => {
                                const isPast = s.data < todayStr;
                                const isNext = s.id === nextSchedule?.id;
                                const dayOfWeek = format(parseISO(s.data), 'EEEE', { locale: ptBR });
                                
                                return (
                                  <tr 
                                    key={s.id} 
                                    className={`transition-colors ${
                                      isNext ? 'bg-yellow-50 dark:bg-yellow-900/10' : 
                                      isPast ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : 
                                      'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                  >
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col">
                                        <span className={`text-xs font-black ${isNext ? 'text-yellow-600' : isPast ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
                                          {format(parseISO(s.data), 'dd/MM')}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                      {s.nomes}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => deleteSchedule(s.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }) : (
                                <tr>
                                  <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic text-xs">Sem escala</td>
                                </tr>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </SortableBlock>
                );
              }

              return null;
            })}
          </SortableContext>
        </div>
      </DndContext>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Exportar Relatório</h3>
                    <p className="text-sm text-blue-100 font-medium">Selecione o período de análise</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Data Inicial</label>
                    <input 
                      type="date" 
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Data Final</label>
                    <input 
                      type="date" 
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                    O relatório incluirá a ordem da fila, checklist diário, horários de almoço e todo o histórico de atividades registradas para cada operador no período selecionado.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    <span>Baixar Relatório (Excel)</span>
                  </button>
                  <button 
                    onClick={() => setShowReportModal(false)}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Edit Modal */}
      <AnimatePresence>
        {editingSchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Editar Escala: Presencial
                </h3>
                <button onClick={() => setEditingSchedule(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Escala</label>
                  <input 
                    type="date" 
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-slate-700 dark:text-slate-300"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecione os Operadores</label>
                  <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-1">
                    {operators.map(op => {
                      const isSelected = scheduleNames.split(' & ').includes(op.nome);
                      return (
                        <button
                          key={op.id}
                          onClick={() => {
                            const currentNames = scheduleNames ? scheduleNames.split(' & ') : [];
                            if (isSelected) {
                              setScheduleNames(currentNames.filter(n => n !== op.nome).join(' & '));
                            } else {
                              setScheduleNames([...currentNames, op.nome].join(' & '));
                            }
                          }}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${
                            isSelected 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className="text-xs font-bold">{op.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visualização da Escala</label>
                  <input 
                    type="text" 
                    value={scheduleNames}
                    onChange={(e) => setScheduleNames(e.target.value)}
                    placeholder="Nomes selecionados aparecerão aqui..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-slate-700 dark:text-slate-300"
                  />
                </div>
                
                <button 
                  onClick={handleScheduleUpdate}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Salvar Escala
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Browser Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 bg-slate-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                    <History className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black">Explorador de Histórico</h2>
                    <p className="text-slate-400 text-sm">Selecione qualquer dia que possui registros de fila</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="p-3 hover:bg-white/10 rounded-2xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {availableDates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <History className="w-16 h-16 opacity-10 mb-4" />
                    <p className="font-bold">Nenhum registro histórico encontrado.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Unique months */}
                    {Array.from(new Set(availableDates.map(d => d.substring(0, 7)))).sort((a,b) => b.localeCompare(a)).map(month => (
                      <div key={month} className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">
                          {format(parseISO(month + '-01T12:00:00'), 'MMMM yyyy', { locale: ptBR })}
                        </h3>
                        <div className="space-y-2">
                          {availableDates.filter(d => d.startsWith(month)).map(dateStr => (
                            <button
                              key={dateStr}
                              onClick={() => {
                                const [y, m, d] = dateStr.split('-').map(Number);
                                setSelectedDate(new Date(y, m - 1, d));
                                setShowHistoryModal(false);
                              }}
                              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all group ${
                                format(selectedDate, 'yyyy-MM-dd') === dateStr
                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:border-primary/50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-black">{dateStr.split('-')[2]}</span>
                                <div className="flex flex-col items-start leading-none">
                                  <span className="text-[10px] uppercase font-black opacity-60">
                                    {format(parseISO(dateStr + 'T12:00:00'), 'EEEE', { locale: ptBR })}
                                  </span>
                                  <span className="text-xs font-bold">Fila de Atendimento</span>
                                </div>
                              </div>
                              <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${format(selectedDate, 'yyyy-MM-dd') === dateStr ? 'text-white/50' : 'text-slate-300'}`} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex justify-end">
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="px-6 py-2.5 font-black text-xs uppercase text-slate-500 hover:text-slate-900 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Operator Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Adicionar à Fila</h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-2 max-h-[400px] overflow-auto">
                {operators.filter(op => !currentQueue.some(q => q.operador_id === op.id)).map(op => (
                  <button 
                    key={op.id}
                    onClick={() => {
                      addOperatorToQueue(op.id);
                      setShowAddModal(false);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all group"
                  >
                    <div className="text-left">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{op.nome}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">{op.horario_trabalho}</p>
                    </div>
                    <UserPlus className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Management Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Gerenciar Operador: {showStatusModal.nome}</h3>
                <button onClick={() => setShowStatusModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status do Operador</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setAbsentUntil('')}
                      className={`flex-1 py-2 rounded-xl border font-bold text-xs transition-all ${!absentUntil ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`}
                    >
                      Ativo
                    </button>
                    <button 
                      onClick={() => { if (!absentUntil) setAbsentUntil(format(new Date(), "yyyy-MM-dd'T'HH:mm")) }}
                      className={`flex-1 py-2 rounded-xl border font-bold text-xs transition-all ${absentUntil ? 'bg-red-500 text-white border-red-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600'}`}
                    >
                      Ausente
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horário de Trabalho</label>
                  <input 
                    type="text" 
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                    placeholder={showStatusModal.horario_trabalho}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ausente até (opcional)</label>
                    {absentUntil && (
                      <button 
                        onClick={() => setAbsentUntil('')}
                        className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase"
                      >
                        Limpar Ausência
                      </button>
                    )}
                  </div>
                  <input 
                    type="datetime-local" 
                    value={absentUntil}
                    onChange={(e) => setAbsentUntil(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Passagem de Turno</span>
                      <span className="text-[11px] text-slate-500 font-medium">Define se é o responsável pela passagem de turno hoje.</span>
                    </div>
                    <button 
                      onClick={() => setIsHandover(!isHandover)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isHandover ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isHandover ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posição Fixa na Fila</label>
                    <select 
                      value={posicaoFixa === null ? '' : posicaoFixa}
                      onChange={(e) => setPosicaoFixa(e.target.value === '' ? null : Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                    >
                      <option value="">Livre</option>
                      <option value="1">1º Fixo</option>
                      <option value="2">2º Fixo</option>
                      <option value="3">3º Fixo</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={handleStatusUpdate}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}