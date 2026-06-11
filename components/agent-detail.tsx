'use client';

import React from 'react';
import { CollaboratorStats } from '@/lib/data-utils';
import { X, Clock, CheckCircle, TrendingUp, TrendingDown, Lightbulb, Award, GraduationCap, MessageSquare, Zap, ThumbsUp, ThumbsDown, Plus, Target, Medal, Percent } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '@/context/app-context';

import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

interface AgentDetailProps {
   agent: CollaboratorStats | null;
   onClose: () => void;
}

export default function AgentDetail({ agent, onClose }: AgentDetailProps) {
   const { userRole, updateCollaboratorBadges, updateCollaboratorGoals, pointsConfig, selectedRows } = useApp();
   const [newBadge, setNewBadge] = React.useState('');
   const [showGoalForm, setShowGoalForm] = React.useState(false);
   const [newGoal, setNewGoal] = React.useState({ title: '', target: 0, deadline: '' });

   if (!agent) return null;

   const handleAddBadge = () => {
     if (!newBadge.trim()) return;
     const currentBadges = agent.badges || [];
     if (!currentBadges.includes(newBadge.trim())) {
       updateCollaboratorBadges(agent.name, [...currentBadges, newBadge.trim()]);
     }
     setNewBadge('');
   };

   const handleRemoveBadge = (badge: string) => {
     const currentBadges = agent.badges || [];
     updateCollaboratorBadges(agent.name, currentBadges.filter(b => b !== badge));
   };

   const handleAddGoal = () => {
     if (!newGoal.title || !newGoal.target || !newGoal.deadline) return;
     const currentGoals = agent.goals || [];
     const goal = {
       id: Math.random().toString(36).substring(7),
       ...newGoal,
       current: 0
     };
     updateCollaboratorGoals(agent.name, [...currentGoals, goal]);
     setNewGoal({ title: '', target: 0, deadline: '' });
     setShowGoalForm(false);
   };

   const handleRemoveGoal = (id: string) => {
     const currentGoals = agent.goals || [];
     updateCollaboratorGoals(agent.name, currentGoals.filter(g => g.id !== id));
   };

   const handleUpdateGoalProgress = (id: string, current: number) => {
     const currentGoals = agent.goals || [];
     updateCollaboratorGoals(agent.name, currentGoals.map(g => g.id === id ? { ...g, current } : g));
   };

   // Use date-filtered rows instead of all rawRows
   const agentRows = selectedRows ? selectedRows.filter(r => r.colaborador === agent.name) : [];
   
   // Team average for comparison - use filtered data
   const validRows = selectedRows ? selectedRows.filter(r => !r.isExcluded && r.tempoResposta !== null) : [];
   const teamAvgResponseTime = validRows.length > 0 
     ? validRows.reduce((acc, r) => acc + (r.tempoResposta || 0), 0) / validRows.length 
     : 0;

   const speedDiff = teamAvgResponseTime > 0 
     ? ((teamAvgResponseTime - agent.avgResponseTime) / teamAvgResponseTime) * 100 
     : 0;

   // Volume comparison - use filtered data
   const totalTickets = selectedRows ? selectedRows.filter(r => !r.isExcluded).length : 0;
   const uniqueCollabs = selectedRows ? new Set(selectedRows.filter(r => !r.isExcluded).map(r => r.colaborador)).size : 0;
   const teamAvgVolume = uniqueCollabs > 0 ? totalTickets / uniqueCollabs : 0;
   const volumeDiff = teamAvgVolume > 0 ? ((agent.totalAtendimentos - teamAvgVolume) / teamAvgVolume) * 100 : 0;

   // Quality comparison - use filtered data
   const validRatings = selectedRows ? selectedRows.filter(r => !r.isExcluded && r.avaliacao > 0) : [];
   const teamAvgRating = validRatings.length > 0 
     ? validRatings.reduce((acc, r) => acc + r.avaliacao, 0) / validRatings.length 
     : 0;
   const qualityDiff = teamAvgRating > 0 ? ((agent.avgRating - teamAvgRating) / teamAvgRating) * 100 : 0;

  // Distribution data
  const ratings = [5, 4, 3, 2, 1].map(star => {
    const count = agentRows.filter(r => Math.round(r.avaliacao) === star).length;
    return {
      star,
      count,
      percentage: agentRows.length > 0 ? (count / agentRows.length) * 100 : 0
    };
  }).filter(r => r.count > 0 || r.star === 5 || r.star === 1);

  // Evolution data: Group by date and calculate daily average
  const dailyData = new Map<string, { sum: number, count: number, date: Date }>();
  
  agentRows
    .filter(r => r.tempoResposta !== null)
    .forEach(r => {
      const dateKey = r.data.toISOString().split('T')[0];
      const current = dailyData.get(dateKey) || { sum: 0, count: 0, date: r.data };
      current.sum += r.tempoResposta || 0;
      current.count += 1;
      dailyData.set(dateKey, current);
    });

  const evolutionData = Array.from(dailyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-10)
    .map(([_, val]) => ({
      name: val.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      fullDate: val.date.toLocaleDateString('pt-BR'),
      tempo: Number((val.sum / val.count).toFixed(2))
    }));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-2xl bg-slate-50 dark:bg-slate-950 h-full shadow-2xl overflow-y-auto"
        >
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold dark:text-slate-100">Análise do Colaborador</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Profile Header */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6 items-center">
              <div className="relative">
                {agent.avatarUrl ? (
                  <Image 
                    src={agent.avatarUrl} 
                    alt={agent.name} 
                    width={96}
                    height={96}
                    className="w-24 h-24 rounded-full border-4 border-primary/5 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-black border-4 border-primary/5">
                    {agent.name.charAt(0)}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <h1 className="text-2xl font-bold tracking-tight dark:text-slate-100">{agent.name}</h1>
                  {agent.badge && (
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">{agent.badge}</span>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Colaborador de Suporte</p>
                <div className="flex justify-center md:justify-start gap-4 mt-3 text-slate-400 dark:text-slate-500 text-xs font-medium">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Ativo no período</span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center min-w-[80px]">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Tickets</p>
                  <p className="text-xl font-black dark:text-slate-100">{agent.totalAtendimentos}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-center min-w-[80px]">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">Score</p>
                  <p className="text-xl font-black text-primary">{agent.score.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            {/* Insight Box */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-start gap-4">
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-primary">Insight de Performance</h4>
                <p className="text-slate-700 text-sm leading-relaxed mt-1">
                  {speedDiff > 0 ? (
                    <>Este colaborador responde <span className="font-bold text-primary">{Math.abs(Math.round(speedDiff))}% mais rápido</span> que a média do time.</>
                  ) : speedDiff < 0 ? (
                    <>Este colaborador responde <span className="font-bold text-rose-600">{Math.abs(Math.round(speedDiff))}% mais devagar</span> que a média do time.</>
                  ) : (
                    <>Este colaborador responde na média do time.</>
                  )}
                  {agent.avgRating >= 4.5 && <> Mantendo uma excelente taxa de satisfação.</>}
                </p>
              </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Avaliação Média</p>
                  <ThumbsUp className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-black dark:text-slate-100">{agent.avgRating.toFixed(2)}/5</p>
                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[10px] font-bold mt-1">
                  Baseado em {agent.totalEvaluations} avaliações
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tempo Resposta</p>
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-black dark:text-slate-100">{agent.avgResponseTime.toFixed(2)}m</p>
                <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${speedDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {speedDiff >= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {Math.abs(Math.round(speedDiff))}% vs média
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Atendimentos</p>
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <p className="text-2xl font-black dark:text-slate-100">{agent.totalAtendimentos}</p>
                <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[10px] font-bold mt-1">
                  Total processado
                </div>
              </div>
            </div>

            {/* Points Breakdown Section */}
            {agent.pointsBreakdown && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2 dark:text-slate-100">
                  <Award className="w-4 h-4 text-primary" /> Detalhamento da Pontuação
                </h3>
                
                <div className="space-y-6">
{/* Volume */}
                   <div className="space-y-3">
                     <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                       <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                         <MessageSquare className="w-4 h-4 text-blue-500" /> Volume
                       </h4>
                       <span className="font-black text-blue-600 dark:text-blue-400">{agent.pointsBreakdown.volume.points > 0 ? '+' : ''}{agent.pointsBreakdown.volume.points} pts</span>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 dark:text-slate-400">Atendimentos realizados ({agent.pointsBreakdown.volume.count}x {pointsConfig.volume} pt{pointsConfig.volume !== 1 ? 's' : ''})</span>
                       <span className="font-medium dark:text-slate-300">{agent.pointsBreakdown.volume.points} pts</span>
                     </div>
                     {agent.totalAtendimentos > 0 && (
                       <div className="flex justify-between items-center text-sm">
                         <span className="text-slate-500 dark:text-slate-400">Taxa de Avaliações</span>
                         <span className="font-medium text-slate-700 dark:text-slate-300">
                           {agent.totalEvaluations} / {agent.totalAtendimentos} ({Math.round((agent.totalEvaluations / agent.totalAtendimentos) * 100)}%)
                         </span>
                       </div>
                     )}
                   </div>

                  {/* Quality */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-emerald-500" /> Qualidade
                      </h4>
                      <span className={`font-black ${agent.pointsBreakdown.quality.fiveStars.points + agent.pointsBreakdown.quality.oneStar.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {agent.pointsBreakdown.quality.fiveStars.points + agent.pointsBreakdown.quality.oneStar.points > 0 ? '+' : ''}
                        {agent.pointsBreakdown.quality.fiveStars.points + agent.pointsBreakdown.quality.oneStar.points} pts
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><ThumbsUp className="w-3 h-3 text-emerald-500" /> Good ({agent.pointsBreakdown.quality.fiveStars.count}x {pointsConfig.fiveStars} pts)</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">+{agent.pointsBreakdown.quality.fiveStars.points} pts</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1"><ThumbsDown className="w-3 h-3 text-red-500" /> Bad ({agent.pointsBreakdown.quality.oneStar.count}x {pointsConfig.oneStar} pts)</span>
                      <span className="font-medium text-red-600 dark:text-red-400">{agent.pointsBreakdown.quality.oneStar.points} pts</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Outras avaliações ({agent.pointsBreakdown.quality.other.count}x 0 pts)</span>
                      <span className="font-medium text-slate-400 dark:text-slate-600">0 pts</span>
                    </div>
                  </div>

{/* Speed */}
                   <div className="space-y-3">
                     <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                       <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                         <Zap className="w-4 h-4 text-emerald-500" /> Velocidade
                       </h4>
                       <span className={`font-black ${agent.pointsBreakdown.speed.under1m.points + agent.pointsBreakdown.speed.under3m.points + agent.pointsBreakdown.speed.over3m.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                         {agent.pointsBreakdown.speed.under1m.points + agent.pointsBreakdown.speed.under3m.points + agent.pointsBreakdown.speed.over3m.points > 0 ? '+' : ''}
                         {agent.pointsBreakdown.speed.under1m.points + agent.pointsBreakdown.speed.under3m.points + agent.pointsBreakdown.speed.over3m.points} pts
                       </span>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 dark:text-slate-400">Respostas &lt; 1 min ({agent.pointsBreakdown.speed.under1m.count}x {pointsConfig.speedUnder1m} pts)</span>
                       <span className="font-medium text-emerald-600 dark:text-emerald-400">+{agent.pointsBreakdown.speed.under1m.points} pts</span>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 dark:text-slate-400">Respostas 1-3 min ({agent.pointsBreakdown.speed.under3m.count}x {pointsConfig.speedUnder3m} pts)</span>
                       <span className="font-medium text-emerald-600 dark:text-emerald-400">+{agent.pointsBreakdown.speed.under3m.points} pts</span>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 dark:text-slate-400">Respostas &gt; 3 min ({agent.pointsBreakdown.speed.over3m.count}x {pointsConfig.speedOver3m} pt)</span>
                       <span className="font-medium text-rose-600 dark:text-rose-400">{agent.pointsBreakdown.speed.over3m.points} pts</span>
                     </div>
                   </div>

                   {/* Response Rate Bonus */}
                   {agent.pointsBreakdown.responseRateBonus && agent.pointsBreakdown.responseRateBonus.bonusPoints > 0 && (
                   <div className="space-y-3">
                     <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                       <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                         <Percent className="w-4 h-4 text-indigo-500" /> Bonificação Taxa de Resposta
                       </h4>
                       <span className="font-black text-indigo-600 dark:text-indigo-400">
                         +{agent.pointsBreakdown.responseRateBonus.bonusPoints} pts
                       </span>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-500 dark:text-slate-400">
                         Taxa atingida: {agent.responseRate?.toFixed(1)}%
                         {agent.pointsBreakdown.responseRateBonus.minPercentage && 
                          ` (faixa: ≥${agent.pointsBreakdown.responseRateBonus.minPercentage}%)`}
                       </span>
                       <span className="font-medium text-indigo-600 dark:text-indigo-400">+{agent.pointsBreakdown.responseRateBonus.bonusPoints} pts</span>
                     </div>
                   </div>
                   )}

                   {/* Total */}
                  <div className="mt-6 pt-4 border-t-2 border-slate-800 dark:border-slate-700 flex justify-between items-center">
                    <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Pontuação Total</h4>
                    <span className="text-2xl font-black text-primary">{agent.pointsBreakdown.total} pts</span>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2 dark:text-slate-100">
                  <ThumbsUp className="w-4 h-4 text-primary" /> Distribuição de Avaliações
                </h3>
                <div className="space-y-3">
                  {ratings.map(r => (
                    <div key={r.star} className="grid grid-cols-[30px_1fr_40px] items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        {r.star === 5 ? <ThumbsUp className="w-3 h-3 text-emerald-500" /> : r.star === 1 ? <ThumbsDown className="w-3 h-3 text-red-500" /> : r.star}
                      </span>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${r.percentage}%` }}
                          className={`h-full rounded-full ${r.star === 5 ? 'bg-emerald-500' : r.star === 1 ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`} 
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 text-right font-bold">{Math.round(r.percentage)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2 dark:text-slate-100">
                  <TrendingUp className="w-4 h-4 text-primary" /> Comparativo com a Equipe
                </h3>
                <div className="space-y-6">
                  {/* Volume Comparison */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Volume de Atendimentos</span>
                      <span className={`text-[10px] font-black uppercase whitespace-nowrap ${volumeDiff > 10 ? 'text-emerald-500' : volumeDiff > -10 ? 'text-primary' : 'text-red-500'}`}>
                        {volumeDiff > 25 ? 'Muito acima da média' : 
                         volumeDiff > 10 ? 'Acima da média' : 
                         volumeDiff > -10 ? 'Na média da equipe' : 
                         volumeDiff > -25 ? 'Abaixo da média' : 'Baixo volume'}
                      </span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-lg relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-slate-200 dark:bg-slate-700 w-[50%] border-r border-slate-300 dark:border-slate-600" />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(5, Math.min(95, 50 + (volumeDiff / 2)))}%` }}
                        className={`absolute top-1.5 left-0 h-1 rounded-full ${volumeDiff > 10 ? 'bg-emerald-500' : volumeDiff > -10 ? 'bg-primary' : 'bg-red-500'}`} 
                      />
                    </div>
                  </div>

                  {/* Speed Comparison */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Velocidade de Resposta</span>
                      <span className={`text-[10px] font-black uppercase whitespace-nowrap ${agent.avgResponseTime < 1 ? 'text-emerald-500' : agent.avgResponseTime <= 3 ? 'text-primary' : 'text-red-500'}`}>
                        {agent.avgResponseTime < 1 ? 'Excelente (Referência)' : 
                         agent.avgResponseTime <= 3 ? 'Bom' : 'A melhorar / Ruim'}
                      </span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-lg relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-slate-200 dark:bg-slate-700 w-[50%] border-r border-slate-300 dark:border-slate-600" />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${
                            agent.avgResponseTime <= 1 
                              ? 75 + (1 - agent.avgResponseTime) * 20 // 0m = 95%, 1m = 75%
                              : agent.avgResponseTime <= 3 
                                ? 50 + (3 - agent.avgResponseTime) * 12.5 // 1m = 75%, 3m = 50%
                                : Math.max(5, 50 - (agent.avgResponseTime - 3) * 5) // 3m = 50%, 12m = 5%
                          }%` 
                        }}
                        className={`absolute top-1.5 left-0 h-1 rounded-full ${agent.avgResponseTime < 1 ? 'bg-emerald-500' : agent.avgResponseTime <= 3 ? 'bg-primary' : 'bg-red-500'}`} 
                      />
                    </div>
                  </div>

                  {/* Quality Comparison */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Qualidade (Avaliações)</span>
                      <span className={`text-[10px] font-black uppercase whitespace-nowrap ${
                        agent.avgRating >= 5 ? 'text-emerald-500' : 
                        agent.avgRating >= 4.5 ? 'text-primary' : 
                        agent.avgRating >= 4.0 ? 'text-orange-500' : 'text-red-500'
                      }`}>
                        {agent.avgRating >= 5 ? 'Excelente' : 
                         agent.avgRating >= 4.5 ? 'Na média' : 
                         agent.avgRating >= 4.0 ? 'Precisa melhorar' : 'Ruim'}
                      </span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-lg relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-slate-200 dark:bg-slate-700 w-[50%] border-r border-slate-300 dark:border-slate-600" />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${
                            agent.avgRating >= 5 ? 95 :
                            agent.avgRating >= 4.5 ? 50 + (agent.avgRating - 4.5) * 90 : // 4.5=50, 5.0=95
                            agent.avgRating >= 4.0 ? 25 + (agent.avgRating - 4.0) * 50 : // 4.0=25, 4.5=50
                            Math.max(5, (agent.avgRating / 4) * 25) // 0=0, 4=25
                          }%` 
                        }}
                        className={`absolute top-1.5 left-0 h-1 rounded-full ${
                          agent.avgRating >= 5 ? 'bg-emerald-500' : 
                          agent.avgRating >= 4.5 ? 'bg-primary' : 
                          agent.avgRating >= 4.0 ? 'bg-orange-500' : 'bg-red-500'
                        }`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Evolution Chart */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[300px] flex flex-col">
              <h3 className="text-sm font-bold mb-6 dark:text-slate-100">Evolução do Tempo de Resposta (min)</h3>
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <AreaChart data={evolutionData}>
                    <defs>
                      <linearGradient id="colorTempo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3713ec" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3713ec" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid-color, #f1f5f9)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip 
                      formatter={(value: any) => [`${value} min`, 'Tempo']}
                      labelFormatter={(label) => `Data: ${label}`}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'var(--tooltip-bg, #fff)',
                        color: 'var(--tooltip-text, #000)'
                      }} 
                    />
                    <Area type="monotone" dataKey="tempo" stroke="#3713ec" strokeWidth={3} fillOpacity={1} fill="url(#colorTempo)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Suggested Next Steps */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold dark:text-slate-100">Próximos Passos Sugeridos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agent.score >= 80 ? (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Award className="w-8 h-8 text-primary bg-primary/10 p-2 rounded-lg" />
                    <div>
                      <h4 className="font-bold text-xs dark:text-slate-200">Reconhecimento</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Performance exemplar. Considerar para bonificação ou mentoria.</p>
                    </div>
                  </div>
                ) : agent.score >= 50 ? (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <TrendingUp className="w-8 h-8 text-blue-500 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg" />
                    <div>
                      <h4 className="font-bold text-xs dark:text-slate-200">Manutenção de Ritmo</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Bom desempenho. Focar em consistência para atingir o próximo nível.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Zap className="w-8 h-8 text-orange-500 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg" />
                    <div>
                      <h4 className="font-bold text-xs dark:text-slate-200">Plano de Melhoria</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Identificar gargalos no tempo de resposta para subir o score.</p>
                    </div>
                  </div>
                )}
                
                {agent.avgRating < 4 ? (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <GraduationCap className="w-8 h-8 text-primary bg-primary/10 p-2 rounded-lg" />
                    <div>
                      <h4 className="font-bold text-xs dark:text-slate-200">Treinamento de Qualidade</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Reciclagem em atendimento para melhorar a satisfação dos clientes.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <ThumbsUp className="w-8 h-8 text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg" />
                    <div>
                      <h4 className="font-bold text-xs dark:text-slate-200">Feedback Positivo</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Excelente qualidade percebida pelos clientes. Manter o padrão.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gamification: Badges & Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Badges Section */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2 dark:text-slate-100">
                    <Medal className="w-4 h-4 text-primary" /> Conquistas (Badges)
                  </h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {(agent.badges || []).length > 0 ? (
                    agent.badges?.map((badge, idx) => (
                      <div key={idx} className="group relative px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold flex items-center gap-2">
                        {badge}
                        {userRole === 'admin' && (
                          <button 
                            onClick={() => handleRemoveBadge(badge)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Nenhuma conquista ainda.</p>
                  )}
                </div>

                {userRole === 'admin' && (
                  <div className="flex gap-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="Nova medalha..." 
                      className="flex-1 text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary dark:text-slate-100"
                      value={newBadge}
                      onChange={(e) => setNewBadge(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddBadge()}
                    />
                    <button 
                      onClick={handleAddBadge}
                      className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Goals Section */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2 dark:text-slate-100">
                    <Target className="w-4 h-4 text-primary" /> Metas de Desenvolvimento
                  </h3>
                  {userRole === 'admin' && (
                    <button 
                      onClick={() => setShowGoalForm(!showGoalForm)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {(agent.goals || []).length > 0 ? (
                    agent.goals?.map((goal) => (
                      <div key={goal.id} className="space-y-2 group">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{goal.title}</p>
                            <p className="text-[8px] text-slate-400 dark:text-slate-500 uppercase">Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-primary">{Math.round((goal.current / goal.target) * 100)}%</span>
                            {userRole === 'admin' && (
                              <button 
                                onClick={() => handleRemoveGoal(goal.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 dark:text-slate-600 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                        {userRole === 'admin' && (
                          <input 
                            type="range" 
                            min="0" 
                            max={goal.target} 
                            value={goal.current}
                            onChange={(e) => handleUpdateGoalProgress(goal.id, Number(e.target.value))}
                            className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Nenhuma meta definida.</p>
                  )}
                </div>

                {showGoalForm && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3">
                    <input 
                      type="text" 
                      placeholder="Título da meta" 
                      className="w-full text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-slate-100"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="number" 
                        placeholder="Alvo (ex: 100)" 
                        className="w-full text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-slate-100"
                        value={newGoal.target || ''}
                        onChange={(e) => setNewGoal({...newGoal, target: Number(e.target.value)})}
                      />
                      <input 
                        type="date" 
                        className="w-full text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg dark:text-slate-100"
                        value={newGoal.deadline}
                        onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={handleAddGoal}
                      className="w-full py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90"
                    >
                      Adicionar Meta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

