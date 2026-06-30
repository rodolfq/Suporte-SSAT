'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useApp, UserPermissions } from '@/context/app-context';
import { supabase } from '@/lib/supabase';
import { DEFAULT_AVATARS } from '@/lib/data-utils';
import { 
  Database, 
  Trash2, 
  User, 
  Users,
  Check, 
  AlertCircle, 
  Calendar, 
  FileText,
  RefreshCw,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  Terminal,
  X,
  Sparkles,
  UserPlus,
  Shield,
  Key,
  Mail,
  Loader2,
  MoreVertical,
  Award,
  Clock,
  Pause,
  Play,
  Settings2,
  CalendarDays,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Percent
} from 'lucide-react';
import { ResponseRateBonusTier } from '@/lib/data-utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import AvatarCreator from './avatar-creator';

// Ranking Rules Widget Component with Save Button and Feedback
function RankingRulesWidget({ 
  pointsConfig, 
  updatePointsConfig 
}: { 
  pointsConfig: any, 
  updatePointsConfig: (config: any) => void 
}) {
  const [savedConfig, setSavedConfig] = React.useState(pointsConfig);
  const [isSaved, setIsSaved] = React.useState(true);
  const [showSuccess, setShowSuccess] = React.useState(false);

// Check if config has changed from saved state
    React.useEffect(() => {
      const hasChanged = 
        pointsConfig.volume !== savedConfig.volume ||
        pointsConfig.fiveStars !== savedConfig.fiveStars ||
        pointsConfig.oneStar !== savedConfig.oneStar ||
        pointsConfig.speedUnder1m !== savedConfig.speedUnder1m ||
        pointsConfig.speedUnder3m !== savedConfig.speedUnder3m ||
        pointsConfig.speedOver3m !== savedConfig.speedOver3m ||
        pointsConfig.volumeLimit !== savedConfig.volumeLimit ||
        (pointsConfig.responseRateBonusTiers || []).length !== (savedConfig.responseRateBonusTiers || []).length;
      
      setIsSaved(!hasChanged);
    }, [pointsConfig, savedConfig]);

  const handleSave = () => {
    // Config is already saved to localStorage via updatePointsConfig
    // Just update the saved state to reflect current values
    setSavedConfig({ ...pointsConfig });
    setIsSaved(true);
    
    // Show success feedback
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

   const handleRestoreDefault = () => {
     const defaultConfig = {
       volume: 1,
       fiveStars: 10,
       oneStar: -90,
       speedUnder1m: 5,
       speedUnder3m: 0.5,
       speedOver3m: -1,
       volumeLimit: 0 // 0 means no limit
     };
     updatePointsConfig(defaultConfig);
     setSavedConfig(defaultConfig);
     setIsSaved(true);
     setShowSuccess(true);
     setTimeout(() => setShowSuccess(false), 3000);
   };

  return (
    <section className="space-y-4 h-full">
      <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <Award className="w-4 h-4" />
        Configurar Pontos do Ranking de Analistas
      </h3>
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between h-[calc(100%-2.5rem)] gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Defina a pontuação que cada item ganha ou perde na contabilização do ranking final de analistas. Os pesos se aplicam em tempo real.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
               <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Volume (+1 Atend.)</label>
               <input 
                 type="number" 
                 step="any"
                 value={pointsConfig.volume} 
                 onChange={(e) => updatePointsConfig({ ...pointsConfig, volume: Number(e.target.value) })}
                 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
               />
             </div>
             <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
               <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Limitador de Pontos de Volume</label>
               <input 
                 type="number" 
                 step="any"
                 value={pointsConfig.volumeLimit} 
                 onChange={(e) => updatePointsConfig({ ...pointsConfig, volumeLimit: Number(e.target.value) })}
                 className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
               />
               <p className="text-[9px] text-slate-500 dark:text-slate-400 italic">
                 0 = sem limite
               </p>
             </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Avaliação 5 Estrelas</label>
              <input 
                type="number" 
                step="any"
                value={pointsConfig.fiveStars} 
                onChange={(e) => updatePointsConfig({ ...pointsConfig, fiveStars: Number(e.target.value) })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Avaliação 1 Estrela</label>
              <input 
                type="number" 
                step="any"
                value={pointsConfig.oneStar} 
                onChange={(e) => updatePointsConfig({ ...pointsConfig, oneStar: Number(e.target.value) })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Resposta {'<'} 1 min</label>
              <input 
                type="number" 
                step="any"
                value={pointsConfig.speedUnder1m} 
                onChange={(e) => updatePointsConfig({ ...pointsConfig, speedUnder1m: Number(e.target.value) })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Resposta {'<'} 3 min</label>
              <input 
                type="number" 
                step="any"
                value={pointsConfig.speedUnder3m} 
                onChange={(e) => updatePointsConfig({ ...pointsConfig, speedUnder3m: Number(e.target.value) })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none block">Resposta {'>'} 3 min</label>
              <input 
                type="number" 
                step="any"
                value={pointsConfig.speedOver3m} 
                onChange={(e) => updatePointsConfig({ ...pointsConfig, speedOver3m: Number(e.target.value) })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {!isSaved && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Alterações pendentes
              </span>
            )}
            {showSuccess && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                <Check className="w-3 h-3" />
                Configuração salva e aplicada!
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleRestoreDefault}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Restaurar Padrão
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaved}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isSaved 
                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 cursor-default' 
                  : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvo
                </>
              ) : (
                <>
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Response Rate Bonus Widget Component
function ResponseRateBonusWidget({ 
  pointsConfig, 
  updatePointsConfig 
}: { 
  pointsConfig: any, 
  updatePointsConfig: (config: any) => void 
}) {
  const [savedConfig, setSavedConfig] = React.useState(pointsConfig);
  const [isSaved, setIsSaved] = React.useState(true);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [editingTier, setEditingTier] = React.useState<string | null>(null);
  const [newTier, setNewTier] = React.useState({ minPercentage: null as number | null, bonusPoints: null as number | null });
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const tiers = pointsConfig.responseRateBonusTiers || [];

  React.useEffect(() => {
    const savedTiers = savedConfig.responseRateBonusTiers || [];
    const currentTiers = pointsConfig.responseRateBonusTiers || [];
    const hasChanged = 
      savedTiers.length !== currentTiers.length ||
      savedTiers.some((t: any, i: number) => 
        t.minPercentage !== currentTiers[i]?.minPercentage ||
        t.bonusPoints !== currentTiers[i]?.bonusPoints
      );
    setIsSaved(!hasChanged);
  }, [pointsConfig, savedConfig]);

  const validateTiers = (tiers: any[]) => {
    const percentages = tiers.map(t => t.minPercentage);
    const duplicates = percentages.filter((p, i) => percentages.indexOf(p) !== i);
    if (duplicates.length > 0) {
      return `Percentual duplicado encontrado: ${duplicates[0]}%`;
    }
    for (const tier of tiers) {
      if (tier.minPercentage < 0) {
        return 'Percentual não pode ser negativo';
      }
      if (tier.bonusPoints < 0) {
        return 'Pontos adicionais não podem ser negativos';
      }
    }
    return null;
  };

  const handleSave = () => {
    const error = validateTiers(tiers);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setSavedConfig({ ...pointsConfig });
    setIsSaved(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleAddTier = () => {
    if (newTier.minPercentage === null || newTier.bonusPoints === null) {
      setValidationError('Preencha ambos os campos');
      return;
    }
    if (newTier.minPercentage < 0 || newTier.bonusPoints < 0) {
      setValidationError('Valores não podem ser negativos');
      return;
    }
    const newId = Date.now().toString();
    const updatedTiers = [...tiers, { ...newTier, id: newId, minPercentage: newTier.minPercentage, bonusPoints: newTier.bonusPoints }];
    const sortedTiers = updatedTiers.sort((a, b) => a.minPercentage - b.minPercentage);
    
    const error = validateTiers(sortedTiers);
    if (error) {
      setValidationError(error);
      return;
    }
    
    updatePointsConfig({
      ...pointsConfig,
      responseRateBonusTiers: sortedTiers
    });
    setNewTier({ minPercentage: null, bonusPoints: null });
    setValidationError(null);
  };

  const handleEditTier = (id: string, field: 'minPercentage' | 'bonusPoints', value: number) => {
    const updatedTiers = tiers.map((tier: ResponseRateBonusTier) =>
      tier.id === id ? { ...tier, [field]: value } : tier
    );
    
    const error = validateTiers(updatedTiers);
    if (error) {
      setValidationError(error);
      return;
    }
    
    setValidationError(null);
    updatePointsConfig({
      ...pointsConfig,
      responseRateBonusTiers: updatedTiers
    });
    setEditingTier(null);
  };

  const handleDeleteTier = (id: string) => {
    const updatedTiers = tiers.filter((tier: ResponseRateBonusTier) => tier.id !== id);
    updatePointsConfig({
      ...pointsConfig,
      responseRateBonusTiers: updatedTiers
    });
  };

  const handleRestoreDefault = () => {
    const defaultConfig = {
      ...pointsConfig,
      responseRateBonusTiers: [
        { id: '1', minPercentage: 20, bonusPoints: 10 },
        { id: '2', minPercentage: 25, bonusPoints: 20 },
        { id: '3', minPercentage: 30, bonusPoints: 30 }
      ]
    };
    updatePointsConfig(defaultConfig);
    setSavedConfig(defaultConfig);
    setIsSaved(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const sortedTiers = [...tiers].sort((a, b) => a.minPercentage - b.minPercentage);

  return (
    <section className="space-y-4 h-full">
      <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
        <Percent className="w-4 h-4" />
        Bonificação por Taxa de Resposta
      </h3>
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between h-[calc(100%-2.5rem)] gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Configure faixas de bonificação baseadas na taxa de avaliações respondidas pelos colaboradores. A maior faixa atingida será aplicada automaticamente.
          </p>
          
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-2">Exemplo:</p>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500 dark:text-slate-400">
                  <th className="text-left">Taxa mínima (%)</th>
                  <th className="text-left">Pontos</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-300">
                {sortedTiers.map(tier => (
                  <tr key={tier.id}>
                    <td>{tier.minPercentage}% →</td>
                    <td>+{tier.bonusPoints} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {sortedTiers.map((tier) => (
              <div key={tier.id} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Mínimo (%)</label>
                    {editingTier === tier.id ? (
                      <input 
                        type="number"
                        min="0"
                        value={tier.minPercentage}
                        onChange={(e) => handleEditTier(tier.id, 'minPercentage', Number(e.target.value))}
                        onBlur={() => setEditingTier(null)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold"
                      />
                    ) : (
                      <span 
                        className="text-xs font-bold cursor-pointer hover:text-primary"
                        onClick={() => setEditingTier(tier.id)}
                      >
                        {tier.minPercentage}%
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase">Pontos</label>
                    {editingTier === tier.id ? (
                      <input 
                        type="number"
                        min="0"
                        value={tier.bonusPoints}
                        onChange={(e) => handleEditTier(tier.id, 'bonusPoints', Number(e.target.value))}
                        onBlur={() => setEditingTier(null)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold"
                      />
                    ) : (
                      <span 
                        className="text-xs font-bold cursor-pointer hover:text-primary"
                        onClick={() => setEditingTier(tier.id)}
                      >
                        +{tier.bonusPoints}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTier(tier.id)}
                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Nova Faixa</p>
<div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="0"
                placeholder="Mínimo (%)"
                value={newTier.minPercentage ?? ''}
                onChange={(e) => setNewTier({ ...newTier, minPercentage: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold"
              />
              <input
                type="number"
                min="0"
                placeholder="Pontos"
                value={newTier.bonusPoints ?? ''}
                onChange={(e) => setNewTier({ ...newTier, bonusPoints: e.target.value ? Number(e.target.value) : null })}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold"
              />
            </div>
            <button
              onClick={handleAddTier}
              disabled={newTier.minPercentage === null || newTier.minPercentage === undefined || newTier.bonusPoints === null || newTier.bonusPoints === undefined}
              className="mt-2 w-full px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Adicionar Faixa
            </button>
          </div>
          
          {validationError && (
            <p className="text-[10px] text-red-500 mt-2">{validationError}</p>
          )}
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {!isSaved && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Alterações pendentes
              </span>
            )}
            {showSuccess && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in slide-in-from-left-2">
                <Check className="w-3 h-3" />
                Configuração salva e aplicada!
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleRestoreDefault}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Restaurar Padrão
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaved}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isSaved 
                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 cursor-default' 
                  : 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20'
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvo
                </>
              ) : (
                <>
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Sortable Item Component for Settings
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
    opacity: isDragging ? 0.6 : 1,
    gridColumn: `span ${w}`,
    gridRow: `span ${h}`,
  };

  return (
    <div ref={setNodeRef} style={style} className="group/item relative flex flex-col h-full min-h-[150px]">
      <div className="absolute top-4 left-4 flex flex-col items-start gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
        <div className="flex items-center bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xl">
          <div className="flex flex-col border-r border-slate-100 dark:border-slate-700 pr-1 mr-1">
            <button 
              onClick={() => onHeightChange(id, 1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
              title="Aumentar Altura"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onHeightChange(id, -1)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 transition-colors"
              title="Diminuir Altura"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => onWidthChange(id, -1)}
            disabled={w <= 2}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 text-slate-500 transition-colors"
            title="Diminuir Largura"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black px-2 min-w-[40px] text-center text-slate-600 dark:text-slate-400 font-mono">{w}x{h}</span>
          <button 
            onClick={() => onWidthChange(id, 1)}
            disabled={w >= 12}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30 text-slate-500 transition-colors"
            title="Aumentar Largura"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button 
          {...attributes} 
          {...listeners}
          className="p-2.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl cursor-grab active:cursor-grabbing shadow-2xl hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-2"
        >
          <GripVertical className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest pr-1">Mover</span>
        </button>
      </div>
      {children}
    </div>
  );
}

interface UserData {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  displayName?: string;
  createdAt?: any;
  status?: string;
  permissions?: UserPermissions;
}

const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  view_general: true,
  view_tickets_dash: true,
  view_odoo_dash: false,
  view_comparison: true,
  view_ranking: true,
  view_raw_data: false,
  view_odoo_tickets: false,
  view_bitrix_tickets: false,
  view_metrics: false,
  view_performance_charts: false,
  view_sla_metrics: false,
  view_satisfaction_data: false,
  view_training: false,
  view_queue: false,
  upload_data: false,
  manage_users: false,
  export_reports: false,
  sync_external_data: false,
  delete_data: false,
  edit_collaborators: false
};

const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  view_general: true,
  view_tickets_dash: true,
  view_odoo_dash: true,
  view_comparison: true,
  view_ranking: true,
  view_raw_data: true,
  view_odoo_tickets: true,
  view_bitrix_tickets: true,
  view_metrics: true,
  view_performance_charts: true,
  view_sla_metrics: true,
  view_satisfaction_data: true,
  view_training: true,
  view_queue: true,
  upload_data: true,
  manage_users: true,
  export_reports: true,
  sync_external_data: true,
  delete_data: true,
  edit_collaborators: true
};

export default function Settings() {
  const { 
    uploads, 
    collaborators, 
    deleteUpload, 
    deleteCollaborator, 
    updateCollaboratorAvatar, 
    refreshData, 
    clearAllData,
    isLoading, 
    error,
    user,
    userRole,
    userPermissions,
    bitrixUsers,
    bitrixSchedules,
    loadingBitrix,
    fetchBitrixTimeman,
    fetchBitrixSchedules,
    handleTimemanAction,
    lastKnownDurations,
    settingsLayout,
    updateSettingsLayout,
    pointsConfig,
    updatePointsConfig
  } = useApp();
  const [selectedCollab, setSelectedCollab] = useState<string | null>(null);
  const [showFixScript, setShowFixScript] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'upload' | 'collab' | 'user', id: string, extra?: string } | null>(null);
  const [showAvatarCreator, setShowAvatarCreator] = useState<string | null>(null);

  // User Management State
  const [users, setUsers] = useState<UserData[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [setPasswordLoading, setSetPasswordLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions | null>(null);

  // Bitrix Timeman UI State
  const [now, setNow] = useState<number>(Date.now());
  const [lastAutoAction, setLastAutoAction] = useState<Record<string, string>>({});
  const [showScheduleModal, setShowScheduleModal] = useState<any | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<any>({
    mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: ''
  });
  const [editingAction, setEditingAction] = useState<'close' | 'pause'>('close');
  const [saveScheduleLoading, setSaveScheduleLoading] = useState(false);

  // API Secrets Management State
  const [isSavingBitrix, setIsSavingBitrix] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);

// Layout Management State
   const defaultSettingsWidgets = [
     { id: 'db-status', w: 12, h: 2 },
     { id: 'api-integrations', w: 12, h: 2 },
     { id: 'ranking-rules', w: 12, h: 4 },
     { id: 'response-rate-bonus', w: 12, h: 6 },
     { id: 'user-management', w: 12, h: 4 },
     { id: 'bitrix-timeman', w: 12, h: 6 },
     { id: 'uploads', w: 6, h: 4 },
     { id: 'collaborators', w: 6, h: 4 }
   ];

  const [widgets, setWidgets] = useState(defaultSettingsWidgets);

  useEffect(() => {
    if (settingsLayout && Array.isArray(settingsLayout) && settingsLayout.length > 0) {
      setWidgets(settingsLayout);
    }
  }, [settingsLayout]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = widgets.findIndex((i) => i.id === active.id);
      const newIndex = widgets.findIndex((i) => i.id === over.id);
      const newWidgets = arrayMove(widgets, oldIndex, newIndex);
      setWidgets(newWidgets);
      updateSettingsLayout(newWidgets);
    }
  };

  const handleWidthChange = (id: string, delta: number) => {
    const newWidgets = widgets.map(w => {
      if (w.id === id) {
        const newW = Math.max(2, Math.min(12, (w.w || 0) + delta));
        return { ...w, w: newW };
      }
      return w;
    });
    setWidgets(newWidgets);
    updateSettingsLayout(newWidgets);
  };

  const handleHeightChange = (id: string, delta: number) => {
    const newWidgets = widgets.map(w => {
      if (w.id === id) {
        const newH = Math.max(1, Math.min(12, (w.h || 0) + delta));
        return { ...w, h: newH };
      }
      return w;
    });
    setWidgets(newWidgets);
    updateSettingsLayout(newWidgets);
  };

  const handleSaveSecret = async (keyName: string, value: string) => {
    if (!value) return;
    
    try {
      const supabaseClient = supabase;
      if (!supabaseClient) throw new Error('Supabase não configurado');
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await fetch('/api/settings/secrets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ keyName, value })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao salvar segredo');

      setResetSuccess(`${keyName} atualizado com sucesso.`);
      setTimeout(() => setResetSuccess(null), 5000);
    } catch (err: any) {
      console.error('Erro ao salvar segredo:', err);
      setAddUserError(err.message || 'Erro ao salvar chave.');
    } finally {
      // Finalizado
    }
  };

  const handleClearCache = () => {
    setIsClearingCache(true);
    try {
      // Limpa localStorage
      localStorage.clear();
      // Limpa sessionStorage
      sessionStorage.clear();
      // Força um reload imediato
      window.location.reload();
    } catch (err) {
      console.error('Erro ao limpar cache:', err);
      setIsClearingCache(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    const supabaseClient = supabase;
    if (userRole !== 'admin' || !supabaseClient) {
      setLoadingUsers(false);
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('email');
      
      if (error) {
        console.error('Erro detalhado ao buscar usuários (Supabase):', error);
        throw error;
      }
      
      setUsers((data || []).map(u => ({
        uid: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
        permissions: u.permissions
      })));
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      setAddUserError(`Erro ao buscar usuários: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoadingUsers(false);
    }
  }, [userRole]);

  useEffect(() => {
    const supabaseClient = supabase;
    if (userRole !== 'admin' || !supabaseClient) {
      setLoadingUsers(false);
      return;
    }

    fetchUsers();

    const channel = supabaseClient
      .channel('profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [userRole, fetchUsers]);

  // Timer for live duration updates and automatic actions
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      // Automatic Actions Check
      if (bitrixSchedules.length > 0 && bitrixUsers.length > 0) {
        const date = new Date(currentTime);
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDay = days[date.getDay()];
        
        // Robust HH:MM calculation
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const currentHHMM = `${hh}:${mm}`;

        bitrixSchedules.forEach(sched => {
          const targetTime = sched.schedule?.[currentDay];
          if (!targetTime || targetTime !== currentHHMM) return;

          // Check if we already performed an action for this user at this exact minute
          if (lastAutoAction[sched.user_id] === currentHHMM) return;

          const user = bitrixUsers.find(u => String(u.id) === String(sched.user_id));
          if (!user) return;

          const action = sched.action || 'close';
          
          // Only trigger if status is not already what we want
          if (action === 'pause' && user.status === 'OPENED') {
            console.log(`[BitrixAuto] Auto-pausing user ${sched.user_id} at ${currentHHMM}`);
            handleTimemanAction(sched.user_id, 'pause');
            setLastAutoAction(prev => ({ ...prev, [sched.user_id]: currentHHMM }));
          } else if (action === 'close' && (user.status === 'OPENED' || user.status === 'PAUSED')) {
            console.log(`[BitrixAuto] Auto-closing user ${sched.user_id} at ${currentHHMM}`);
            handleTimemanAction(sched.user_id, 'close');
            setLastAutoAction(prev => ({ ...prev, [sched.user_id]: currentHHMM }));
          }
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [bitrixSchedules, bitrixUsers, lastAutoAction, handleTimemanAction]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabaseClient = supabase;
    if (!newUserEmail || !newUserPassword || !supabaseClient) return;
    
    setAddUserLoading(true);
    setAddUserError(null);
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const defaultPermissions = newUserRole === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS;

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newUserEmail.trim().toLowerCase(),
          password: newUserPassword,
          role: newUserRole,
          permissions: defaultPermissions
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário');

      setNewUserEmail('');
      setNewUserPassword('');
      setShowAddUser(false);
      setResetSuccess(`Usuário ${newUserEmail} criado como ${newUserRole}.`);
      await fetchUsers();
      setTimeout(() => setResetSuccess(null), 5000);
    } catch (err: any) {
      console.error('Erro detalhado ao adicionar usuário:', err);
      
      let errorMsg = 'Erro desconhecido';
      if (err?.message === 'Failed to fetch') {
        errorMsg = 'Falha na conexão com o banco de dados.';
      } else {
        errorMsg = err?.message || String(err);
      }
      
      setAddUserError(`Erro ao salvar usuário: ${errorMsg}`);
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleUpdatePermissions = async (userEmail: string) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !tempPermissions) return;

    try {
      const { error, count } = await supabaseClient
        .from('profiles')
        .update({ permissions: tempPermissions })
        .eq('email', userEmail)
        .select(); // Força o retorno para garantir que o RLS permitiu

      if (error) throw error;
      
      // Força a atualização da lista local
      await fetchUsers();
      
      setEditingPermissions(null);
      setResetSuccess('Permissões atualizadas com sucesso.');
      setTimeout(() => setResetSuccess(null), 3000);
    } catch (err: any) {
      console.error('Erro detalhado ao atualizar permissões:', err);
      
      let errorMsg = 'Erro ao atualizar permissões.';
      
      if (err.code === '42501') {
        errorMsg = 'Permissão negada: Verifique se você executou o script SQL de configuração no Supabase (especialmente as políticas de RLS).';
      } else if (err.message) {
        errorMsg = err.message;
      } else if (typeof err === 'object') {
        errorMsg = JSON.stringify(err);
      }
      
      setAddUserError(errorMsg);
    }
  };

  const togglePermission = (key: keyof UserPermissions) => {
    if (!tempPermissions) return;
    setTempPermissions({
      ...tempPermissions,
      [key]: !tempPermissions[key]
    });
  };

  const permissionLabels: Record<keyof UserPermissions, string> = {
    view_general: 'Dashboard Geral',
    view_tickets_dash: 'Dashboard de Tickets',
    view_odoo_dash: 'Odoo Dashboard',
    view_comparison: 'Comparativo',
    view_ranking: 'Ranking',
    view_raw_data: 'Dados Brutos',
    view_odoo_tickets: 'Atendimentos Odoo',
    view_bitrix_tickets: 'Atendimentos Bitrix',
    view_metrics: 'Métricas Planilha',
    view_training: 'Treinamento',
    view_queue: 'Fila de Atendimento',
    view_performance_charts: 'Gráficos de Performance',
    view_sla_metrics: 'Métricas de SLA',
    view_satisfaction_data: 'Dados de Satisfação',
    upload_data: 'Fazer Upload de Planilhas',
    manage_users: 'Gerenciar Usuários e Permissões',
    export_reports: 'Exportar Relatórios (Download)',
    sync_external_data: 'Sincronizar Dados Externos (Odoo/Bitrix)',
    delete_data: 'Excluir Dados e Uploads',
    edit_collaborators: 'Editar Avatares e Colaboradores'
  };

  const permissionCategories = {
    screens: [
      'view_general',
      'view_tickets_dash',
      'view_odoo_dash',
      'view_comparison',
      'view_ranking',
      'view_raw_data',
      'view_odoo_tickets',
      'view_bitrix_tickets',
      'view_metrics',
      'view_training',
      'view_queue',
      'view_performance_charts',
      'view_sla_metrics',
      'view_satisfaction_data'
    ] as (keyof UserPermissions)[],
    actions: [
      'upload_data',
      'manage_users',
      'export_reports',
      'sync_external_data',
      'delete_data',
      'edit_collaborators'
    ] as (keyof UserPermissions)[]
  };

  const handleResetPassword = async (email: string) => {
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setResetSuccess(`E-mail de redefinição enviado para ${email}`);
      setTimeout(() => setResetSuccess(null), 5000);
    } catch (err: any) {
      console.error('Erro ao enviar reset:', err);
      setAddUserError(err.message || 'Erro ao enviar e-mail de redefinição.');
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabaseClient = supabase;
    if (!supabaseClient || !showSetPassword || !newPassword || !user) return;

    setSetPasswordLoading(true);
    setAddUserError(null);

    try {
      // 1. Se for o próprio usuário logado, usa o método padrão do SDK
      if (showSetPassword.uid === user.id) {
        const { error } = await supabaseClient.auth.updateUser({
          password: newPassword
        });
        if (error) throw error;
      } else {
        // 2. Se for outro usuário, usa a API server-side (requer service_role key)
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error('Sessão expirada. Faça login novamente.');

        const response = await fetch('/api/auth/set-password', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: showSetPassword.uid,
            email: showSetPassword.email,
            newPassword: newPassword
          })
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Erro ao definir senha');
        }
      }

      setResetSuccess(`Senha de ${showSetPassword.email} atualizada com sucesso.`);
      setShowSetPassword(null);
      setNewPassword('');
      setTimeout(() => setResetSuccess(null), 5000);
    } catch (err: any) {
      console.error('Erro ao definir senha:', err);
      setAddUserError(err.message || 'Erro ao definir senha. Verifique se o SUPABASE_SERVICE_ROLE_KEY está configurado.');
    } finally {
      setSetPasswordLoading(false);
    }
  };

  const openScheduleModal = (bitrixUser: any) => {
    const existing = bitrixSchedules.find(s => s.user_id === String(bitrixUser.id));
    if (existing) {
      setEditingSchedule(existing.schedule || {});
      setEditingAction(existing.action || 'close');
    } else {
      setEditingSchedule({
        mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: ''
      });
      setEditingAction('close');
    }
    setShowScheduleModal(bitrixUser);
  };

  const handleSaveSchedule = async () => {
    if (!showScheduleModal) return;
    setSaveScheduleLoading(true);
    try {
      const response = await fetch('/api/bitrix/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: String(showScheduleModal.id),
          user_name: showScheduleModal.name,
          schedule: editingSchedule,
          action: editingAction,
          active: true
        })
      });
      const data = await response.json();
      if (data.success) {
        setResetSuccess('Agendamento salvo com sucesso.');
        fetchBitrixSchedules();
        setShowScheduleModal(null);
        setTimeout(() => setResetSuccess(null), 3000);
      } else {
        throw new Error(data.error || 'Erro ao salvar agendamento');
      }
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setAddUserError(err.message);
    } finally {
      setSaveScheduleLoading(false);
    }
  };

  const isSupabaseConfigured = !!supabase && !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const handleDelete = async () => {
    const supabaseClient = supabase;
    if (!confirmDelete || !supabaseClient) return;
    
    if (confirmDelete.type === 'upload') {
      await deleteUpload(confirmDelete.id);
    } else if (confirmDelete.type === 'collab') {
      await deleteCollaborator(confirmDelete.id);
    } else if (confirmDelete.type === 'user') {
      try {
        const { error } = await supabaseClient
          .from('profiles')
          .delete()
          .eq('email', confirmDelete.id);
        if (error) throw error;
        setUsers(prev => prev.filter(u => u.email !== confirmDelete.id));
        setResetSuccess('Usuário excluído com sucesso.');
        setTimeout(() => setResetSuccess(null), 3000);
      } catch (err: any) {
        console.error('Erro ao excluir usuário:', err);
        setAddUserError(`Erro ao excluir usuário: ${err.message || String(err)}`);
      }
    }
    setConfirmDelete(null);
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case 'db-status':
        return (
          <section className="space-y-4 h-full">
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Database className="w-4 h-4" />
              Status do Banco de Dados
            </h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 h-[calc(100%-2.5rem)]">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSupabaseConfigured ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
                  {isSupabaseConfigured ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-slate-100">
                    {isSupabaseConfigured ? 'Conexão Ativa' : 'Sem Conexão'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isSupabaseConfigured 
                      ? 'Seu banco de dados Supabase está configurado e pronto para uso.' 
                      : 'Configure as variáveis de ambiente para habilitar persistência.'}
                  </p>
                </div>
              </div>

              {isSupabaseConfigured && (
                <div className="flex gap-4 w-full md:w-auto">
                  <div className="flex-1 md:flex-none p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Versão</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Supabase v2</p>
                  </div>
                  <div className="flex-1 md:flex-none p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Região</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Global</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      case 'api-integrations':
        if (!(userRole === 'admin' || user?.email?.toLowerCase() === 'admin@systemsat.com.br')) return null;
        return (
          <section className="space-y-4 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Integrações e Chaves de API
              </h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-xl">
                <ShieldCheck className="w-5 h-5 mt-0.5 text-emerald-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-blue-900 dark:text-blue-400 font-bold text-sm">Integrações de API</h4>
                  </div>
                  <p className="text-blue-700 dark:text-blue-500 text-[10px] mt-1">
                    Configure os webhooks e chaves de acesso para sincronização automática de dados.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Outras integrações podem ser adicionadas aqui no futuro */}
              </div>
            </div>
          </section>
        );
      case 'uploads':
        return (
          <section className="space-y-4 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-4 h-4" />
                Histórico de Uploads
              </h3>
              <button 
                onClick={() => refreshData()}
                disabled={isLoading}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-[calc(100%-3rem)] overflow-y-auto custom-scrollbar">
              {uploads.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                  <p className="text-slate-400 text-xs">Nenhum upload.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {uploads.map((upload) => (
                    <div key={upload.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold truncate max-w-[150px]">{upload.filename}</p>
                          <p className="text-[9px] text-slate-400">
                            {format(new Date(upload.created_at), "dd/MM, HH:mm")}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setConfirmDelete({ type: 'upload', id: upload.id })}
                        className="p-1 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      case 'collaborators':
        return (
          <section className="space-y-4 h-full">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4" />
              Perfis dos Colaboradores
            </h3>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm h-[calc(100%-3rem)] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-4">
                {collaborators.map((collab) => (
                  <div key={collab.name} className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 translate-z-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {collab.avatarUrl ? (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200">
                            <Image 
                              src={collab.avatarUrl} 
                              alt={collab.name} 
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                            {collab.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-bold truncate max-w-[100px]">{collab.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setConfirmDelete({ type: 'collab', id: collab.name })}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setSelectedCollab(selectedCollab === collab.name ? null : collab.name)}
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition-all ${
                            selectedCollab === collab.name ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {selectedCollab === collab.name ? 'X' : 'Foto'}
                        </button>
                      </div>
                    </div>

                    {selectedCollab === collab.name && (
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <button
                            onClick={() => setShowAvatarCreator(collab.name)}
                            className="w-8 h-8 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 transition-all shadow-sm"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Link da imagem..."
                          className="w-full text-[10px] bg-white dark:bg-slate-900 border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateCollaboratorAvatar(collab.name, (e.target as HTMLInputElement).value);
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'user-management':
        if (!(userRole === 'admin' || userPermissions?.manage_users || user?.email?.toLowerCase() === 'admin@systemsat.com.br')) return null;
        return (
          <section className="space-y-4 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Usuários
              </h3>
              <button 
                onClick={() => setShowAddUser(true)}
                className="p-1 px-2 bg-primary/10 text-primary rounded text-[10px] font-bold"
              >
                + Novo
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-[calc(100%-3rem)] overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <div key={u.uid} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        {u.email.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold truncate max-w-[120px]">{u.email}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-tight">{u.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingPermissions(u.email); setTempPermissions(u.permissions || (u.role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS)); }} className="p-1 text-slate-400 hover:text-primary"><Shield className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setShowSetPassword(u)} className="p-1 text-slate-400 hover:text-primary"><Key className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setConfirmDelete({ type: 'user', id: u.email })} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case 'bitrix-timeman':
        if (userRole !== 'admin') return null;
        
        const relevantBitrixUsers = bitrixUsers.filter(u => 
          collaborators.length === 0 || collaborators.some(c => u.name.toLowerCase().includes(c.name.toLowerCase())) || 
          collaborators.some(c => c.name.toLowerCase().includes(u.name.toLowerCase()))
        );

        return (
          <section className="space-y-4 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Jornada Bitrix
              </h3>
              <button 
                onClick={() => fetchBitrixTimeman()}
                disabled={loadingBitrix}
                className="p-1 px-2 bg-primary/10 text-primary rounded text-[10px] font-bold"
              >
                Atualizar
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden h-[calc(100%-3rem)] overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {relevantBitrixUsers.length === 0 ? (
                   <div className="p-8 text-center text-slate-400 text-xs">Vazio.</div>
                ) : (
                  relevantBitrixUsers.map((u) => (
                    <div key={u.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                          {u.avatar ? <Image src={u.avatar.startsWith('http') ? u.avatar : `https://systemsat.bitrix24.com.br${u.avatar}`} alt={u.name} fill className="object-cover" referrerPolicy="no-referrer" /> : <User className="w-4 h-4 m-auto mt-2" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold truncate max-w-[100px]">{u.name}</p>
                          <p className={`text-[9px] font-bold ${u.status === 'OPENED' ? 'text-emerald-500' : 'text-slate-400'}`}>{u.status}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {u.status === 'OPENED' && <button onClick={() => handleTimemanAction(u.id, 'pause')} className="p-1 text-amber-500"><Pause className="w-3.5 h-3.5" /></button>}
                        {(u.status === 'OPENED' || u.status === 'PAUSED') && <button onClick={() => handleTimemanAction(u.id, 'close')} className="p-1 text-red-500"><X className="w-3.5 h-3.5" /></button>}
                        <button onClick={() => openScheduleModal(u)} className="p-1 text-slate-400"><Settings2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        );
      case 'ranking-rules':
        return (
          <RankingRulesWidget 
            pointsConfig={pointsConfig} 
            updatePointsConfig={updatePointsConfig} 
          />
        );
      case 'response-rate-bonus':
        return (
          <ResponseRateBonusWidget 
            pointsConfig={pointsConfig} 
            updatePointsConfig={updatePointsConfig} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Gerencie seus dados e perfis de colaboradores.</p>
      </div>


      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-2">Confirmar Exclusão</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                {confirmDelete.type === 'upload' 
                  ? 'Tem certeza que deseja excluir este upload? Todos os dados relacionados serão removidos permanentemente.'
                  : `Tem certeza que deseja excluir o colaborador "${confirmDelete.id}"? Todas as linhas de dados vinculadas a ele serão removidas.`}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-200 dark:shadow-none"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {(!isSupabaseConfigured || error?.toLowerCase().includes('supabase')) && (
        <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl space-y-4">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-amber-900 dark:text-amber-400 font-bold text-sm">Supabase não configurado</h4>
              <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">
                Para persistir seus dados e gerenciar uploads, configure as variáveis de ambiente:
                <div className="mt-2 flex flex-wrap gap-2">
                  <code className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded text-[10px] font-bold dark:text-amber-300">NEXT_PUBLIC_SUPABASE_URL</code>
                  <code className="bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded text-[10px] font-bold dark:text-amber-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                </div>
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t border-amber-200/50 dark:border-amber-900/30">
            <p className="text-[10px] font-black text-amber-800 dark:text-amber-600 uppercase tracking-widest mb-2">Diagnóstico de Conexão:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px]">
              <div className="flex items-center justify-between bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg">
                <span className="text-amber-700 dark:text-amber-500">URL Detectada:</span>
                <span className="font-mono font-bold">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15)}...` : '❌ Ausente'}
                </span>
              </div>
              <div className="flex items-center justify-between bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg">
                <span className="text-amber-700 dark:text-amber-500">Chave Detectada:</span>
                <span className="font-mono font-bold">
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Presente' : '❌ Ausente'}
                </span>
              </div>
            </div>
            <p className="text-[9px] text-amber-600 mt-3 italic">
              * Se você acabou de configurar, tente clicar no botão &quot;Reiniciar Servidor&quot; no menu de configurações do AI Studio ou atualizar a página.
            </p>
          </div>
        </div>
      )}

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-min mt-8">
          <SortableContext 
            items={widgets.map(w => w.id)}
            strategy={rectSortingStrategy}
          >
            {widgets.map((widget) => {
              const content = renderWidget(widget.id);
              if (!content) return null;
              return (
                <SortableItem 
                  key={widget.id} 
                  id={widget.id} 
                  w={widget.w || 12} 
                  h={widget.h || 4}
                  onWidthChange={handleWidthChange}
                  onHeightChange={handleHeightChange}
                >
                  <div className="h-full bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8 transition-all hover:shadow-xl group/card relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    {content}
                  </div>
                </SortableItem>
              );
            })}
          </SortableContext>
        </div>
      </DndContext>




      {/* Set Password Modal */}
      <AnimatePresence>
        {showSetPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Definir Senha</h3>
                </div>
                <button onClick={() => setShowSetPassword(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <p className="text-slate-500 text-sm mb-6">
                Definindo nova senha para: <span className="font-bold text-slate-900">{showSetPassword.email}</span>
              </p>

              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                </div>

                {addUserError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {addUserError}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => setShowSetPassword(null)}
                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={setPasswordLoading}
                    className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    {setPasswordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permissions Modal */}
      <AnimatePresence>
        {editingPermissions && tempPermissions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Permissões do Usuário</h3>
                    <p className="text-slate-500 text-sm">{users.find(u => u.email === editingPermissions)?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingPermissions(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8 mb-8">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Acesso a Telas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissionCategories.screens.map((key) => (
                      <label 
                        key={key}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                          tempPermissions[key] ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tempPermissions[key] ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                          }`}>
                            {tempPermissions[key] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </div>
                          <span className={`text-sm font-bold ${tempPermissions[key] ? 'text-slate-900' : 'text-slate-500'}`}>
                            {permissionLabels[key]}
                          </span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={tempPermissions[key]}
                          onChange={() => togglePermission(key)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-5 rounded-full relative transition-all ${
                          tempPermissions[key] ? 'bg-primary' : 'bg-slate-300'
                        }`}>
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                            tempPermissions[key] ? 'left-6' : 'left-1'
                          }`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Ações Permitidas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissionCategories.actions.map((key) => (
                      <label 
                        key={key}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                          tempPermissions[key] ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            tempPermissions[key] ? 'bg-primary text-white' : 'bg-slate-200 text-slate-400'
                          }`}>
                            {tempPermissions[key] ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </div>
                          <span className={`text-sm font-bold ${tempPermissions[key] ? 'text-slate-900' : 'text-slate-500'}`}>
                            {permissionLabels[key]}
                          </span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={tempPermissions[key]}
                          onChange={() => togglePermission(key)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-5 rounded-full relative transition-all ${
                          tempPermissions[key] ? 'bg-primary' : 'bg-slate-300'
                        }`}>
                          <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${
                            tempPermissions[key] ? 'left-6' : 'left-1'
                          }`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingPermissions(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleUpdatePermissions(editingPermissions)}
                  className="flex-1 px-6 py-3 bg-primary hover:opacity-90 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAddUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Novo Usuário</h3>
                <button onClick={() => setShowAddUser(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="usuario@systemsat.com.br"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Papel</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewUserRole('user')}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                        newUserRole === 'user' ? 'bg-primary/5 border-primary text-primary' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Usuário
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewUserRole('admin')}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                        newUserRole === 'admin' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="password"
                      required
                      minLength={6}
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    />
                  </div>
                </div>

                {addUserError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {addUserError}
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={addUserLoading}
                  className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {addUserLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Adicionar Usuário'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for User Deletion */}
      <AnimatePresence>
        {confirmDelete && confirmDelete.type === 'user' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Remover Usuário</h3>
              <p className="text-slate-500 text-sm mb-8">
                Tem certeza que deseja remover o acesso de <strong>{confirmDelete.extra}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-200"
                >
                  Remover
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAvatarCreator && (
          <AvatarCreator 
            initialName={showAvatarCreator}
            initialOptions={collaborators.find(c => c.name === showAvatarCreator)?.avatarOptions}
            onClose={() => setShowAvatarCreator(null)}
            onSave={(url, options) => {
              updateCollaboratorAvatar(showAvatarCreator, url, options);
              setShowAvatarCreator(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Bitrix Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Agendamento Automático</h3>
                    <p className="text-xs text-slate-500">{showScheduleModal.name}</p>
                  </div>
                </div>
                <button onClick={() => setShowScheduleModal(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Horários de Encerramento</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'mon', label: 'Segunda' },
                      { id: 'tue', label: 'Terça' },
                      { id: 'wed', label: 'Quarta' },
                      { id: 'thu', label: 'Quinta' },
                      { id: 'fri', label: 'Sexta' },
                      { id: 'sat', label: 'Sábado' },
                      { id: 'sun', label: 'Domingo' },
                    ].map((day) => (
                      <div key={day.id} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 ml-1">{day.label}</span>
                        <input 
                          type="time"
                          value={editingSchedule[day.id] || ''}
                          onChange={(e) => setEditingSchedule({ ...editingSchedule, [day.id]: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Ação ao Atingir o Horário</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingAction('close')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        editingAction === 'close' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Encerrar Jornada
                    </button>
                    <button 
                      onClick={() => setEditingAction('pause')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        editingAction === 'pause' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      Pausar Jornada
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowScheduleModal(null)}
                    className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all text-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveSchedule}
                    disabled={saveScheduleLoading}
                    className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    {saveScheduleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}