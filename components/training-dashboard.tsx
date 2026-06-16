'use client';

import { obterPontosGamificacao, LancamentoPonto } from '@/lib/gameficacao-service';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  Trophy,
  Database
} from 'lucide-react';
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
  Pie,
  Legend
} from 'recharts';

export default function TrainingDashboard() {
  const [gamificationPoints, setGamificationPoints] = useState<LancamentoPonto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const onPieEnter = useCallback((_: any, index: number) => {
    setActivePieIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActivePieIndex(null);
  }, []);

  const loadGamificationData = useCallback(async () => {
    const points = await obterPontosGamificacao();
    setGamificationPoints(points);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadGamificationData();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing training data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData]);

  useEffect(() => {
    refreshData();
    // Polling every 1 minute
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, [refreshData]);

  const dashboardStats = useMemo(() => {
    let totalPoints = 0;
    let totalTrainings = 0;
    let totalDocs = 0;
    let totalTools = 0;
    let totalFailures = 0;

    const POINTS_MAP: Record<string, number> = {
      treinamento: 1,
      nova_doc: 3,
      att_doc: 1,
      ferramenta_aut: 5,
      chamado_falha: -1
    };

    const trainerScores: Record<string, {
      name: string;
      score: number;
      qtd: number;
      trainingsCount: number;
      docsCount: number;
      toolsCount: number;
      failuresCount: number;
    }> = {};

    // Accumulate points and action counts from Firestore
    gamificationPoints.forEach(p => {
      const nameKey = p.treinadorNome.split(' ')[0].toLowerCase();
      const actionPoints = POINTS_MAP[p.tipoAcao] ?? p.pontos ?? 0;

      totalPoints += actionPoints;
      if (p.tipoAcao === 'treinamento') totalTrainings++;
      else if (p.tipoAcao === 'nova_doc' || p.tipoAcao === 'att_doc') totalDocs++;
      else if (p.tipoAcao === 'ferramenta_aut') totalTools++;
      else if (p.tipoAcao === 'chamado_falha') totalFailures++;

      if (!trainerScores[nameKey]) {
        trainerScores[nameKey] = {
          name: p.treinadorNome,
          score: 0,
          qtd: 0,
          trainingsCount: 0,
          docsCount: 0,
          toolsCount: 0,
          failuresCount: 0
        };
      }

      const trainer = trainerScores[nameKey];
      trainer.score += actionPoints;
      trainer.qtd += 1;

      if (p.tipoAcao === 'treinamento') trainer.trainingsCount++;
      else if (p.tipoAcao === 'nova_doc' || p.tipoAcao === 'att_doc') trainer.docsCount++;
      else if (p.tipoAcao === 'ferramenta_aut') trainer.toolsCount++;
      else if (p.tipoAcao === 'chamado_falha') trainer.failuresCount++;
    });

    const ranking = Object.values(trainerScores).sort((a, b) => b.score - a.score);

    const acoesTraducao: Record<string, string> = {
      treinamento: "Treinamentos",
      nova_doc: "Novas Docs",
      att_doc: "Atualizações Docs",
      ferramenta_aut: "Ferramentas/Aut.",
      chamado_falha: "Chamados Falha"
    };

    const actionCounts: Record<string, number> = {
      treinamento: totalTrainings,
      nova_doc: gamificationPoints.filter(p => p.tipoAcao === 'nova_doc').length,
      att_doc: gamificationPoints.filter(p => p.tipoAcao === 'att_doc').length,
      ferramenta_aut: totalTools,
      chamado_falha: totalFailures
    };

    const distribution = Object.entries(actionCounts).map(([key, value]) => ({
      name: acoesTraducao[key] || key,
      value
    })).filter(item => item.value > 0);

    return {
      totalPoints,
      totalTrainings,
      totalDocs,
      totalTools,
      totalFailures,
      ranking,
      distribution
    };
  }, [gamificationPoints]);

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const color = payload[0].color || '#6366f1';
      return (
        <div 
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-xl transition-all duration-200"
          style={{ borderColor: color }}
        >
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: color }}>
            {data.name}
          </p>
          <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {payload[0].value} {payload[0].value === 1 ? 'registro' : 'registros'}
          </p>
        </div>
      );
    }
  };

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Só exibe a label se for maior que 5% para não encavalar
    if (!percent || percent < 0.05) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        className="text-[13px] font-black pointer-events-none"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Treinamento</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Monitoramento de produtividade e eficiência operacional
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Última Atualização</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Nunca'}
            </p>
          </div>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando dados do Firebase...</p>
        </div>
      )}

      {!isLoading && gamificationPoints.length === 0 && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700">
            <Trophy className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Nenhum ponto registrado</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto italic">
            Não há registros de pontuação de gamificação salvos no Firestore ainda.
          </p>
        </div>
      )}

      {!isLoading && gamificationPoints.length > 0 && (
        <div className="space-y-8">
          {/* Top Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Points */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{dashboardStats.totalPoints}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Total de Pontos</p>
            </div>

            {/* Total Trainings */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{dashboardStats.totalTrainings}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Treinamentos</p>
            </div>

            {/* Total Documentations */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{dashboardStats.totalDocs}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Documentações</p>
            </div>

            {/* Total Tools/Automations */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{dashboardStats.totalTools}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Ferramentas & Aut.</p>
            </div>

            {/* Total Failures */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{dashboardStats.totalFailures}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Falhas de Treinamento</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ranking Bar Chart */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-slate-100 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />
                Ranking de Pontuação Acumulada
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardStats.ranking} margin={{ left: 10, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid-color, #f1f5f9)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'var(--tooltip-bg, #fff)'
                      }}
                    />
                    <Bar dataKey="score" name="Pontuação" fill="#3713ec" radius={[4, 4, 0, 0]}>
                      {dashboardStats.ranking.map((entry, index) => {
                        let color = "#6366f1";
                        if (index === 0) color = "#fbbf24";
                        if (index === 1) color = "#9ca3af";
                        if (index === 2) color = "#d97706";
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Distribution Pie Chart */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-slate-100 mb-6">
                <PieChartIcon className="w-5 h-5 text-primary" />
                Distribuição de Atividades Registradas
              </h3>
              <div className="h-[300px] flex items-center">
                {dashboardStats.distribution.length === 0 ? (
                  <p className="text-center w-full italic text-slate-400">Nenhum ponto registrado ainda.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dashboardStats.distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        onMouseEnter={onPieEnter}
                        onMouseLeave={onPieLeave}
                        labelLine={false}
                        label={renderCustomizedLabel}
                        activeShape={false}
                      >
                        {dashboardStats.distribution.map((entry, index) => {
                          const COLORS = ['#10b981', '#6366f1', '#06b6d4', '#8b5cf6', '#ef4444'];
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              opacity={activePieIndex === null || activePieIndex === index ? 1 : 0.4}
                              style={{ transition: 'opacity 0.2s ease', cursor: 'pointer', outline: 'none' }}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Resumo por Colaborador Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-slate-100">
                <Users className="w-5 h-5 text-primary" />
                Resumo por Colaborador
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Colaborador</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Pontuação</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Treinamentos</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Documentações</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Ferramentas & Aut.</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Falhas de Treinamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dashboardStats.ranking.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-sm">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`text-sm font-black ${c.score >= 10 ? 'text-emerald-600' : c.score >= 0 ? 'text-slate-700 dark:text-slate-200' : 'text-red-500'}`}>
                          {c.score} pts
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{c.trainingsCount}</td>
                      <td className="px-8 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{c.docsCount}</td>
                      <td className="px-8 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{c.toolsCount}</td>
                      <td className="px-8 py-5 text-right font-medium text-red-500">{c.failuresCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}