'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/app-context';
import { CollaboratorStats } from '@/lib/data-utils';
import { ThumbsUp, ThumbsDown, ArrowUpDown, ChevronLeft, ChevronRight, FileDown, Info, Zap, Trophy, MessageSquare, X, Clock, Star } from 'lucide-react';

interface RankingTableProps {
  onSelect: (collab: CollaboratorStats) => void;
  filteredCollaborators?: CollaboratorStats[];
  showRules?: boolean;
}

export default function RankingTable({ onSelect, filteredCollaborators, showRules = true }: RankingTableProps) {
   const { collaborators: allCollaborators, pointsConfig } = useApp();
   const collaborators = filteredCollaborators || allCollaborators;
  const [sortConfig, setSortConfig] = useState<{ key: keyof CollaboratorStats; direction: 'asc' | 'desc' }>({
    key: 'totalPoints',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedCollab, setSelectedCollab] = useState<CollaboratorStats | null>(null);

  const handleSort = (key: keyof CollaboratorStats) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

// Calculate detailed points breakdown for selected collaborator
    const pointsBreakdown = useMemo(() => {
      if (!selectedCollab || !selectedCollab.pointsBreakdown) return null;

      // Use the pre-calculated pointsBreakdown from the collaborator stats
      // This already respects the date filter applied in app-context
      const agentBreakdown = selectedCollab.pointsBreakdown;

      return {
        volume: {
          total: agentBreakdown.volume.points,
          count: selectedCollab.totalAtendimentos,
          perItem: pointsConfig.volume
        },
        quality: {
          total: agentBreakdown.quality.fiveStars.points + agentBreakdown.quality.oneStar.points,
          good: { count: agentBreakdown.quality.fiveStars.count, points: pointsConfig.fiveStars, total: agentBreakdown.quality.fiveStars.points },
          bad: { count: agentBreakdown.quality.oneStar.count, points: pointsConfig.oneStar, total: agentBreakdown.quality.oneStar.points },
          other: { count: agentBreakdown.quality.other.count, total: 0 }
        },
        speed: {
          total: agentBreakdown.speed.under1m.points + agentBreakdown.speed.under3m.points + agentBreakdown.speed.over3m.points,
          fast: { count: agentBreakdown.speed.under1m.count, label: '< 1 min', points: pointsConfig.speedUnder1m, total: agentBreakdown.speed.under1m.points },
          medium: { count: agentBreakdown.speed.under3m.count, label: '1-3 min', points: pointsConfig.speedUnder3m, total: agentBreakdown.speed.under3m.points },
          slow: { count: agentBreakdown.speed.over3m.count, label: '> 3 min', points: pointsConfig.speedOver3m, total: agentBreakdown.speed.over3m.points }
        },
        total: agentBreakdown.total
      };
    }, [selectedCollab, pointsConfig]);

  const sortedCollaborators = [...collaborators].sort((a, b) => {
    const aVal = a[sortConfig.key] as any;
    const bVal = b[sortConfig.key] as any;
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCollaborators.length / itemsPerPage);
  const paginatedData = sortedCollaborators.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportCSV = () => {
    const headers = ['Posição', 'Colaborador', 'Pontos', 'Avaliação', 'Tempo Médio Resposta', 'Atendimentos'];
    const rows = sortedCollaborators.map(c => [
      c.rank,
      c.name,
      c.totalPoints,
      (c.avgRating ?? 0).toFixed(1),
      (c.avgResponseTime ?? 0).toFixed(1),
      c.totalAtendimentos
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'ranking_performance.csv');
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Ranking Rules Banner */}
      {showRules && (
        <div className="bg-slate-900 dark:bg-slate-900 rounded-3xl p-6 text-white shadow-xl dark:shadow-none overflow-hidden relative border border-white/5 dark:border-slate-800">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">Regras de Pontuação do Ranking</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Volume</p>
                  <p className="text-sm font-medium text-slate-200 dark:text-slate-300">{pointsConfig.volume > 0 ? '+' : ''}{pointsConfig.volume} ponto{pointsConfig.volume !== 1 ? 's' : ''} por atendimento realizado.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Velocidade</p>
                  <p className="text-sm font-medium text-slate-200 dark:text-slate-300">Início do atendimento:</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    {String.fromCharCode(60)}1m: {pointsConfig.speedUnder1m > 0 ? '+' : ''}{pointsConfig.speedUnder1m} pts | 1-3m: {pointsConfig.speedUnder3m > 0 ? '+' : ''}{pointsConfig.speedUnder3m} pts | {String.fromCharCode(62)}3m: {pointsConfig.speedOver3m > 0 ? '+' : ''}{pointsConfig.speedOver3m} pt
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <ThumbsUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Qualidade</p>
                  <p className="text-sm font-medium text-slate-200 dark:text-slate-300">Impacto das avaliações:</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Nota 5: {pointsConfig.fiveStars > 0 ? '+' : ''}{pointsConfig.fiveStars} pts | Nota 1 (Bad): {pointsConfig.oneStar > 0 ? '+' : ''}{pointsConfig.oneStar} pts
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        </div>
      )}

      <div className="flex justify-end items-center">
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-primary font-medium transition-colors"
        >
          <FileDown className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
              <th onClick={() => handleSort('rank')} className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider cursor-pointer hover:text-primary group">
                <div className="flex items-center gap-1">
                  Posição <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th onClick={() => handleSort('name')} className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider cursor-pointer hover:text-primary group">
                <div className="flex items-center gap-1">
                  Colaborador <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th onClick={() => handleSort('totalPoints')} className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider cursor-pointer hover:text-primary group">
                <div className="flex items-center gap-1">
                  Pontos Totais <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th onClick={() => handleSort('avgRating')} className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider cursor-pointer hover:text-primary group">
                <div className="flex items-center gap-1">
                  Avaliação <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th onClick={() => handleSort('avgResponseTime')} className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider cursor-pointer hover:text-primary group text-right">
                <div className="flex items-center justify-end gap-1">
                  1ª Resposta <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
              <th onClick={() => handleSort('totalAtendimentos')} className="px-6 py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider cursor-pointer hover:text-primary group text-right">
                <div className="flex items-center justify-end gap-1">
                  Atendimentos <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedData.map((c) => (
              <tr 
                key={c.name} 
                onClick={() => {
                  onSelect(c);
                  setSelectedCollab(c);
                }}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                  {c.badge ? (
                    <span className="flex items-center gap-1">
                      {c.badge === 'Ouro' && '🥇'}
                      {c.badge === 'Prata' && '🥈'}
                      {c.badge === 'Bronze' && '🥉'}
                      #{c.rank}
                    </span>
                  ) : `#${c.rank}`}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
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
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Agente de Suporte</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-base font-black ${c.totalPoints >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {c.totalPoints > 0 ? `+${c.totalPoints}` : c.totalPoints}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 text-emerald-500 dark:text-emerald-400">
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{(c.avgRating ?? 0).toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-slate-100">{(c.avgResponseTime ?? 0).toFixed(1)}m</td>
                <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-slate-100">{c.totalAtendimentos}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400">Mostrando {paginatedData.length} de {collaborators.length} colaboradores</span>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Analyst Points Breakdown Modal */}
      {selectedCollab && pointsBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button 
              onClick={() => setSelectedCollab(null)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{selectedCollab.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Detalhamento da Pontuação</p>
              </div>
            </div>

            <div className="space-y-6">
{/* Volume */}
 <div className="space-y-3">
   <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
     <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
       <MessageSquare className="w-4 h-4 text-blue-500" />
       Volume
     </h4>
     <span className="font-black text-blue-600 dark:text-blue-400">+{pointsBreakdown.volume.total} pts</span>
   </div>
   <div className="flex justify-between items-center text-sm">
     <span className="text-slate-500 dark:text-slate-400">Atendimentos realizados ({pointsBreakdown.volume.count}x {pointsBreakdown.volume.perItem} pt)</span>
     <span className="font-medium dark:text-slate-300">+{pointsBreakdown.volume.total} pts</span>
   </div>
   {selectedCollab && selectedCollab.totalAtendimentos > 0 && (
     <div className="flex justify-between items-center text-sm">
       <span className="text-slate-500 dark:text-slate-400">Taxa de Avaliações</span>
       <span className="font-medium text-slate-700 dark:text-slate-300">
         {selectedCollab.totalEvaluations} / {selectedCollab.totalAtendimentos} ({Math.round((selectedCollab.totalEvaluations / selectedCollab.totalAtendimentos) * 100)}%)
       </span>
     </div>
   )}
   {pointsConfig.volumeLimit > 0 && pointsBreakdown.volume.total >= pointsConfig.volumeLimit && (
     <div className="text-[9px] text-slate-500 dark:text-slate-400 italic pt-1">
       Limite de volume atingido ({pointsConfig.volumeLimit} pts máximo)
     </div>
   )}
 </div>

              {/* Quality */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Star className="w-4 h-4 text-emerald-500" />
                    Qualidade
                  </h4>
                  <span className={`font-black ${pointsBreakdown.quality.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {pointsBreakdown.quality.total >= 0 ? '+' : ''}{pointsBreakdown.quality.total} pts
                  </span>
                </div>
<div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                     <ThumbsUp className="w-3 h-3 text-emerald-500" />
                     Good ({pointsBreakdown.quality.good.count}x {pointsBreakdown.quality.good.points} pts)
                   </span>
                   <span className="font-medium text-emerald-600 dark:text-emerald-400">{pointsBreakdown.quality.good.total >= 0 ? '+' : ''}{pointsBreakdown.quality.good.total} pts</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                     <ThumbsDown className="w-3 h-3 text-red-500" />
                     Bad ({pointsBreakdown.quality.bad.count}x {pointsBreakdown.quality.bad.points} pts)
                   </span>
                   <span className="font-medium text-red-600 dark:text-red-400">{pointsBreakdown.quality.bad.total} pts</span>
                 </div>
              </div>

              {/* Speed */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Velocidade
                  </h4>
                  <span className={`font-black ${pointsBreakdown.speed.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {pointsBreakdown.speed.total >= 0 ? '+' : ''}{pointsBreakdown.speed.total} pts
                  </span>
                </div>
<div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 dark:text-slate-400">Respostas {pointsBreakdown.speed.fast.label} ({pointsBreakdown.speed.fast.count}x {pointsBreakdown.speed.fast.points} pts)</span>
                   <span className="font-medium text-emerald-600 dark:text-emerald-400">{pointsBreakdown.speed.fast.total >= 0 ? '+' : ''}{pointsBreakdown.speed.fast.total} pts</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 dark:text-slate-400">Respostas {pointsBreakdown.speed.medium.label} ({pointsBreakdown.speed.medium.count}x {pointsBreakdown.speed.medium.points} pts)</span>
                   <span className="font-medium text-emerald-600 dark:text-emerald-400">{pointsBreakdown.speed.medium.total >= 0 ? '+' : ''}{pointsBreakdown.speed.medium.total} pts</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-500 dark:text-slate-400">Respostas {pointsBreakdown.speed.slow.label} ({pointsBreakdown.speed.slow.count}x {pointsBreakdown.speed.slow.points} pt)</span>
                   <span className="font-medium text-rose-600 dark:text-rose-400">{pointsBreakdown.speed.slow.total} pts</span>
                 </div>
              </div>

              {/* Total */}
              <div className="mt-6 pt-4 border-t-2 border-slate-800 dark:border-slate-700 flex justify-between items-center">
                <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Pontuação Total</h4>
                <span className="text-2xl font-black text-primary">{pointsBreakdown.total >= 0 ? '+' : ''}{pointsBreakdown.total} pts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
