'use client';

import React from 'react';
import { useApp } from '@/context/app-context';
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
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';

export default function MetricsView() {
  const { dashboard, collaborators, userPermissions } = useApp();

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8">
        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-700" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sem dados para exibir</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm text-center max-w-xs mt-2">
          Faça o upload de uma planilha para visualizar as métricas detalhadas.
        </p>
      </div>
    );
  }

  // Dados para Gráfico de Performance (Top 5 Colaboradores por Atendimentos)
  const performanceData = [...collaborators]
    .sort((a, b) => b.totalAtendimentos - a.totalAtendimentos)
    .slice(0, 5)
    .map(c => ({
      name: c.name,
      messages: c.totalAtendimentos,
      rating: c.avgRating
    }));

  // Dados para Gráfico de Satisfação
  const satisfactionData = [
    { name: 'Excelente (5)', value: collaborators.reduce((acc, c) => acc + (c.avgRating >= 4.5 ? 1 : 0), 0) },
    { name: 'Bom (4-4.5)', value: collaborators.reduce((acc, c) => acc + (c.avgRating >= 4 && c.avgRating < 4.5 ? 1 : 0), 0) },
    { name: 'Regular (3-4)', value: collaborators.reduce((acc, c) => acc + (c.avgRating >= 3 && c.avgRating < 4 ? 1 : 0), 0) },
    { name: 'Ruim (<3)', value: collaborators.reduce((acc, c) => acc + (c.avgRating < 3 ? 1 : 0), 0) },
  ].filter(d => d.value > 0);

  const COLORS = ['#3713ec', '#6366f1', '#a5b4fc', '#e0e7ff'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Métricas Detalhadas</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Análise profunda da performance e satisfação.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gráfico de Performance */}
        {userPermissions?.view_performance_charts && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Top 5 Performance</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Volume de mensagens por colaborador</p>
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--grid-color, #f1f5f9)" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: 'var(--tooltip-cursor, #f8fafc)' }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: 'var(--tooltip-bg, #fff)',
                      color: 'var(--tooltip-text, #000)'
                    }}
                  />
                  <Bar dataKey="messages" radius={[0, 8, 8, 0]} barSize={24}>
                    {performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#3713ec' : '#6366f1'} fillOpacity={1 - (index * 0.15)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfico de Satisfação */}
        {userPermissions?.view_satisfaction_data && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 rounded-xl flex items-center justify-center">
                  <PieChartIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Distribuição de Satisfação</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Baseado na média de avaliação</p>
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={satisfactionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {satisfactionData.map((entry, index) => (
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
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Métricas de SLA */}
        {userPermissions?.view_sla_metrics && (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Análise de SLA e Resposta</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Tempo médio de resposta inicial e resolução</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Resposta Inicial</span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{dashboard.avgResponseTime.toFixed(1)}s</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <TrendingUp className="w-3 h-3" />
                  <span>Meta: &lt; 60s</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Tempo de Resolução</span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{dashboard.avgDuracao.toFixed(1)}s</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <TrendingUp className="w-3 h-3" />
                  <span>Meta: &lt; 300s</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Taxa de Sucesso</span>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100">98.5%</p>
                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                  <TrendingUp className="w-3 h-3" />
                  <span>Meta: &gt; 95%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}