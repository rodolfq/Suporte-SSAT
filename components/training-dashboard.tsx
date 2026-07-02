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
  Database,
  Calendar,
  Filter
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
  Legend,
  LineChart,
  Line
} from 'recharts';

// Helper functions for parsing durations and waiting times
const parseTimeToMinutes = (timeStr?: string) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
};

const formatMinutes = (totalMinutes: number) => {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const parseDateStr = (dateStr?: string) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  return isNaN(d.getTime()) ? null : d;
};

const getDaysBetween = (d1Str?: string, d2Str?: string) => {
  const d1 = parseDateStr(d1Str);
  const d2 = parseDateStr(d2Str);
  if (!d1 || !d2) return null;
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

interface CustomRechartsBarChartProps {
  title: string;
  data: any[];
  dataKey: string;
  fill: string;
  name: string;
  yAxisLabel?: string;
}

function CustomRechartsBarChart({ title, data, dataKey, fill, name, yAxisLabel }: CustomRechartsBarChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <h3 className="text-base font-bold dark:text-slate-100 mb-4">{title}</h3>
      <div className="h-[240px]">
        {data.length === 0 || !data.some(d => d[dataKey] > 0) ? (
          <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
            Sem dados no período
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid-color, #f1f5f9)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  backgroundColor: '#0f2a5e',
                  color: '#fff'
                }}
                labelStyle={{ fontWeight: 800, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '4px', marginBottom: '4px' }}
                itemStyle={{ color: '#fff', fontWeight: 600 }}
              />
              <Bar dataKey={dataKey} name={name} fill={fill} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function TrainingDashboard() {
  const [gamificationPoints, setGamificationPoints] = useState<LancamentoPonto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Filter States
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('thisMonth');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [filtroTreinador, setFiltroTreinador] = useState<string>('all');

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
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Extract active trainers
  const trainersList = useMemo(() => {
    const names = new Set<string>();
    gamificationPoints.forEach(p => {
      if (p.treinadorNome) {
        names.add(p.treinadorNome);
      }
    });
    return Array.from(names).sort();
  }, [gamificationPoints]);

  // Filter points based on the period filter
  const filteredPoints = useMemo(() => {
    const now = new Date();
    return gamificationPoints.filter((p) => {
      if (!p.dataLancamento) return false;
      const date = new Date(p.dataLancamento);

      switch (filtroPeriodo) {
        case '7days': {
          const diffTime = now.getTime() - date.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 7;
        }
        case '30days': {
          const diffTime = now.getTime() - date.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 30;
        }
        case 'thisMonth': {
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }
        case 'lastMonth': {
          const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const yearOfPrevMonth = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return date.getFullYear() === yearOfPrevMonth && date.getMonth() === prevMonth;
        }
        case 'custom': {
          if (!dataInicio && !dataFim) return true;
          const start = dataInicio ? new Date(dataInicio + 'T00:00:00') : new Date(0);
          const end = dataFim ? new Date(dataFim + 'T23:59:59') : new Date();
          return date >= start && date <= end;
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [gamificationPoints, filtroPeriodo, dataInicio, dataFim]);

  // Process stats for all trainers under current active range
  const trainersStats = useMemo(() => {
    const targetTrainers = filtroTreinador === 'all'
      ? trainersList
      : trainersList.filter(name => name === filtroTreinador);

    return targetTrainers.map(name => {
      const trainerPoints = filteredPoints.filter(p => p.treinadorNome === name);

      // Total trainings
      const trainings = trainerPoints.filter(p => p.tipoAcao === 'treinamento');
      const totalTrainings = trainings.length;

      // Cancelled
      const cancelledTrainings = trainings.filter(p => 
        p.treinamentoTema && 
        p.treinamentoTema.toLowerCase() === 'cancelado'
      ).length;

      // Absent (Clientes Ausentes)
      const absentTrainings = trainings.filter(p => 
        p.treinamentoTema && 
        p.treinamentoTema.toLowerCase() === 'ausente'
      ).length;

      // Realized
      const realizedTrainings = totalTrainings - cancelledTrainings - absentTrainings;

      // Total time in minutes
      let totalMinutes = 0;
      trainings.forEach(p => {
        const isCancelled = p.treinamentoTema && (p.treinamentoTema.toLowerCase() === 'cancelado' || p.treinamentoTema.toLowerCase() === 'ausente');
        if (!isCancelled && p.treinamentoTempoAgenda) {
          totalMinutes += parseTimeToMinutes(p.treinamentoTempoAgenda);
        }
      });

      // TME (Average waiting time in days)
      let sumDays = 0;
      let countDays = 0;
      trainings.forEach(p => {
        const isCancelled = p.treinamentoTema && (p.treinamentoTema.toLowerCase() === 'cancelado' || p.treinamentoTema.toLowerCase() === 'ausente');
        if (!isCancelled && p.treinamentoDataSolicitacao && p.treinamentoDataRealizacao) {
          const days = getDaysBetween(p.treinamentoDataSolicitacao, p.treinamentoDataRealizacao);
          if (days !== null) {
            sumDays += days;
            countDays++;
          }
        }
      });
      const tme = countDays > 0 ? parseFloat((sumDays / countDays).toFixed(1)) : null;

      // TMT (Average duration in minutes)
      const tmt = realizedTrainings > 0 ? Math.round(totalMinutes / realizedTrainings) : null;

      // Average CSAT Score
      let sumScore = 0;
      let countScore = 0;
      trainings.forEach(p => {
        if (p.tipoAcao === 'treinamento' && typeof p.treinamentoNotaMedia === 'number') {
          sumScore += p.treinamentoNotaMedia;
          countScore++;
        }
      });
      const mediaScore = countScore > 0 ? parseFloat((sumScore / countScore).toFixed(2)) : null;

      // Other actions
      const approvedDocs = trainerPoints.filter(p => p.tipoAcao === 'nova_doc').length;
      const attDocs = trainerPoints.filter(p => p.tipoAcao === 'att_doc').length;
      const toolsApproved = trainerPoints.filter(p => p.tipoAcao === 'ferramenta_aut').length;
      const failureTickets = trainerPoints.filter(p => p.tipoAcao === 'chamado_falha').length;

      return {
        name,
        totalTrainings,
        cancelledTrainings,
        absentTrainings,
        realizedTrainings,
        totalMinutes,
        totalTimeFormatted: formatMinutes(totalMinutes),
        tme,
        tmt,
        tmtFormatted: tmt ? formatMinutes(tmt) : '-',
        mediaScore,
        approvedDocs,
        attDocs,
        toolsApproved,
        failureTickets
      };
    }).sort((a, b) => b.realizedTrainings - a.realizedTrainings || b.totalTrainings - a.totalTrainings || a.name.localeCompare(b.name));
  }, [trainersList, filteredPoints, filtroTreinador]);

  // Compute map to 5 charts
  const chartMediaScore = useMemo(() => {
    return trainersStats
      .filter(t => t.mediaScore !== null)
      .map(t => ({
        name: t.name.split(' ')[0],
        value: t.mediaScore || 0
      }));
  }, [trainersStats]);

  const chartApprovedDocs = useMemo(() => {
    return trainersStats.map(t => ({
      name: t.name.split(' ')[0],
      value: t.approvedDocs
    }));
  }, [trainersStats]);

  const chartAttDocs = useMemo(() => {
    return trainersStats.map(t => ({
      name: t.name.split(' ')[0],
      value: t.attDocs
    }));
  }, [trainersStats]);

  const chartToolsApproved = useMemo(() => {
    return trainersStats.map(t => ({
      name: t.name.split(' ')[0],
      value: t.toolsApproved
    }));
  }, [trainersStats]);

  const chartFailureTickets = useMemo(() => {
    return trainersStats.map(t => ({
      name: t.name.split(' ')[0],
      value: t.failureTickets
    }));
  }, [trainersStats]);

  // Filtered points specifically for the standard/ranking stats
  const filteredPointsForStats = useMemo(() => {
    if (filtroTreinador === 'all') {
      return filteredPoints;
    }
    return filteredPoints.filter(p => p.treinadorNome === filtroTreinador);
  }, [filteredPoints, filtroTreinador]);

  // Dynamic Dashboard Stats
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
      baseScore: number;
      score: number;
      qtd: number;
      trainingsCount: number;
      docsCount: number;
      toolsCount: number;
      failuresCount: number;
      bonusPercentage: number;
      taxaResposta: number;
      answeredCount: number;
      realizedCount: number;
    }> = {};

    filteredPointsForStats.forEach(p => {
      const nameKey = p.treinadorNome.split(' ')[0].toLowerCase();
      // Ensure p.pontos (saved as 0 for cancelled/absent in db) takes precedence over generic POINTS_MAP
      const actionPoints = p.pontos ?? POINTS_MAP[p.tipoAcao] ?? 0;

      totalPoints += actionPoints;
      if (p.tipoAcao === 'treinamento') totalTrainings++;
      else if (p.tipoAcao === 'nova_doc' || p.tipoAcao === 'att_doc') totalDocs++;
      else if (p.tipoAcao === 'ferramenta_aut') totalTools++;
      else if (p.tipoAcao === 'chamado_falha') totalFailures++;

      if (!trainerScores[nameKey]) {
        trainerScores[nameKey] = {
          name: p.treinadorNome,
          baseScore: 0,
          score: 0,
          qtd: 0,
          trainingsCount: 0,
          docsCount: 0,
          toolsCount: 0,
          failuresCount: 0,
          bonusPercentage: 0,
          taxaResposta: 0,
          answeredCount: 0,
          realizedCount: 0
        };
      }

      const trainer = trainerScores[nameKey];
      trainer.baseScore += actionPoints;
      trainer.qtd += 1;

      if (p.tipoAcao === 'treinamento') trainer.trainingsCount++;
      else if (p.tipoAcao === 'nova_doc' || p.tipoAcao === 'att_doc') trainer.docsCount++;
      else if (p.tipoAcao === 'ferramenta_aut') trainer.toolsCount++;
      else if (p.tipoAcao === 'chamado_falha') trainer.failuresCount++;
    });

    // Calculate CSAT response rate and bonus percentage per trainer based on the points in the filtered dataset
    Object.keys(trainerScores).forEach(nameKey => {
      const trainer = trainerScores[nameKey];
      const trainerPoints = filteredPointsForStats.filter(p => p.treinadorNome.split(' ')[0].toLowerCase() === nameKey);

      // Filter realized trainings (excluding canceled/absent)
      const realizedTrainings = trainerPoints.filter(p => {
        if (p.tipoAcao !== 'treinamento' || !p.treinamentoTema) return false;
        const themes = p.treinamentoTema.split(',').map(theme => theme.trim().toLowerCase());
        return !themes.includes('cancelado') && !themes.includes('ausente');
      });

      // Count realized trainings that have CSAT responses
      const answeredTrainings = realizedTrainings.filter(
        p => p.treinamentoNotas && p.treinamentoNotas.length > 0
      );

      const totalTrainingsCount = realizedTrainings.length;
      const answeredTrainingsCount = answeredTrainings.length;
      const taxaResposta = totalTrainingsCount > 0 ? answeredTrainingsCount / totalTrainingsCount : 0;

      let bonus = 0;
      if (taxaResposta >= 0.90) bonus = 0.30;
      else if (taxaResposta >= 0.80) bonus = 0.20;
      else if (taxaResposta >= 0.70) bonus = 0.10;

      trainer.score = parseFloat((trainer.baseScore * (1 + bonus)).toFixed(1));
      trainer.bonusPercentage = Math.round(bonus * 100);
      trainer.taxaResposta = taxaResposta;
      trainer.answeredCount = answeredTrainingsCount;
      trainer.realizedCount = totalTrainingsCount;
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
      nova_doc: filteredPointsForStats.filter(p => p.tipoAcao === 'nova_doc').length,
      att_doc: filteredPointsForStats.filter(p => p.tipoAcao === 'att_doc').length,
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
  }, [filteredPointsForStats]);

  // Compute daily training volume distribution
  const dailyDistribution = useMemo(() => {
    const trainings = filteredPointsForStats.filter(p => {
      if (p.tipoAcao !== 'treinamento') return false;
      if (!p.treinamentoTema) return true;
      const themes = p.treinamentoTema.split(',').map(theme => theme.trim().toLowerCase());
      return !themes.includes('cancelado') && !themes.includes('ausente');
    });
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let useFullRange = true;

    switch (filtroPeriodo) {
      case '7days':
        startDate.setDate(now.getDate() - 6);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 29);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'custom':
        if (dataInicio) startDate = new Date(dataInicio + 'T00:00:00');
        else startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        
        if (dataFim) endDate = new Date(dataFim + 'T23:59:59');
        else endDate = now;
        break;
      case 'all':
      default:
        if (trainings.length > 0) {
          const timestamps = trainings.map(p => p.dataLancamento).filter(Boolean);
          const minTime = Math.min(...timestamps);
          const maxTime = Math.max(...timestamps);
          startDate = new Date(minTime);
          endDate = new Date(maxTime);
        } else {
          startDate.setDate(now.getDate() - 29);
        }
        break;
    }

    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90 || diffDays < 0) {
      useFullRange = false;
    }

    const countsMap = new Map<string, number>();

    const getLocalDateStr = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const isWeekend = (d: Date) => {
      const dayOfWeek = d.getDay();
      return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    };

    const isHoliday = (d: Date) => {
      const month = d.getMonth();
      const day = d.getDate();
      const year = d.getFullYear();

      // Fixed national holidays in Brazil
      if (month === 0 && day === 1) return true;   // Ano Novo
      if (month === 3 && day === 21) return true;  // Tiradentes
      if (month === 4 && day === 1) return true;   // Dia do Trabalho
      if (month === 8 && day === 7) return true;   // Independência do Brasil
      if (month === 9 && day === 12) return true;  // Nossa Senhora Aparecida
      if (month === 10 && day === 2) return true;  // Finados
      if (month === 10 && day === 15) return true; // Proclamação da República
      if (month === 10 && day === 20) return true; // Consciência Negra
      if (month === 11 && day === 25) return true; // Natal

      // Variable national holidays (Carnaval, Sexta-feira Santa, Corpus Christi)
      if (year === 2024) {
        if (month === 1 && day === 13) return true; // Carnaval
        if (month === 2 && day === 29) return true; // Sexta-feira Santa
        if (month === 4 && day === 30) return true; // Corpus Christi
      }
      if (year === 2025) {
        if (month === 2 && day === 4) return true;  // Carnaval
        if (month === 3 && day === 18) return true; // Sexta-feira Santa
        if (month === 5 && day === 19) return true; // Corpus Christi
      }
      if (year === 2026) {
        if (month === 1 && day === 17) return true; // Carnaval
        if (month === 3 && day === 3) return true;  // Sexta-feira Santa
        if (month === 5 && day === 4) return true;  // Corpus Christi
      }
      if (year === 2027) {
        if (month === 1 && day === 9) return true;  // Carnaval
        if (month === 2 && day === 26) return true; // Sexta-feira Santa
        if (month === 4 && day === 27) return true; // Corpus Christi
      }

      return false;
    };

    if (useFullRange) {
      const current = new Date(start);
      let limit = 0;
      while (current <= end && limit < 150) {
        if (!isWeekend(current) && !isHoliday(current)) {
          const key = getLocalDateStr(current);
          countsMap.set(key, 0);
        }
        current.setDate(current.getDate() + 1);
        limit++;
      }
    }

    trainings.forEach(p => {
      if (!p.dataLancamento) return;
      const tDate = new Date(p.dataLancamento);
      if (isWeekend(tDate) || isHoliday(tDate)) return;

      const dateStr = getLocalDateStr(tDate);
      if (!useFullRange) {
        countsMap.set(dateStr, (countsMap.get(dateStr) || 0) + 1);
      } else if (countsMap.has(dateStr)) {
        countsMap.set(dateStr, countsMap.get(dateStr)! + 1);
      }
    });

    return Array.from(countsMap.entries())
      .map(([dateStr, count]) => {
        const [year, month, day] = dateStr.split('-');
        const formattedDate = `${day}/${month}`;
        return {
          dateStr,
          formattedDate,
          count
        };
      })
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [filteredPointsForStats, filtroPeriodo, dataInicio, dataFim]);

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
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Seção 1: Filtros do Painel */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-100 dark:border-slate-800 pb-3">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h2>Filtros de Período e Treinador</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Período de Lançamento</label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={filtroPeriodo}
                    onChange={(e) => setFiltroPeriodo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-primary transition-all appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '14px'
                    }}
                  >
                    <option value="all">Todo o Período</option>
                    <option value="7days">Últimos 7 dias</option>
                    <option value="30days">Últimos 30 dias</option>
                    <option value="thisMonth">Este Mês</option>
                    <option value="lastMonth">Mês Passado</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>
              </div>

              {filtroPeriodo === 'custom' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Inicial</label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Data Final</label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-primary transition-all"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Treinador</label>
                <div className="relative flex items-center">
                  <Users className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={filtroTreinador}
                    onChange={(e) => setFiltroTreinador(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-primary transition-all appearance-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      backgroundSize: '14px'
                    }}
                  >
                    <option value="all">Todos os Treinadores</option>
                    {trainersList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Tabela de Resumo de Desempenho dos Treinadores */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-slate-100">
                <Users className="w-5 h-5 text-indigo-600" />
                Resumo de Desempenho dos Treinadores
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Treinador</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Treinamentos Totais</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Realizados</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Cancelados</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Ausentes</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Tempo Total na Agenda</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Espera Média (TME)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">CSAT Médio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {trainersStats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400 italic">
                        Nenhum treinador encontrado para o filtro aplicado.
                      </td>
                    </tr>
                  ) : (
                    trainersStats.map((t) => (
                      <tr key={t.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                              {t.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{t.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center font-bold text-slate-900 dark:text-slate-100">{t.totalTrainings}</td>
                        <td className="px-6 py-5 text-center font-bold text-emerald-600 dark:text-emerald-400">{t.realizedTrainings}</td>
                        <td className="px-6 py-5 text-center font-bold text-red-500">{t.cancelledTrainings}</td>
                        <td className="px-6 py-5 text-center font-bold text-amber-500">{t.absentTrainings}</td>
                        <td className="px-6 py-5 text-center">
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold">
                            {t.totalTimeFormatted}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center font-semibold text-slate-600 dark:text-slate-400">
                          {t.tme !== null ? `${t.tme} ${t.tme === 1 ? 'dia' : 'dias'}` : '-'}
                        </td>
                        <td className="px-6 py-5 text-center">
                          {t.mediaScore !== null ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black ${
                              t.mediaScore >= 8 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' 
                                : t.mediaScore >= 6 
                                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' 
                                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                            }`}>
                              ★ {t.mediaScore.toFixed(2)}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {/* Gráfico de Volume de Treinamentos por Dia */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 dark:text-slate-100">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Volume de Treinamentos por Dia
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Activity className="w-3 h-3" />
                <span>Evolução do período selecionado</span>
              </div>
            </div>

            <div className="h-[280px]">
              {dailyDistribution.length === 0 || !dailyDistribution.some(d => d.count > 0) ? (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                  Sem dados de treinamentos no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--grid-color, #f1f5f9)"
                    />
                    <XAxis
                      dataKey="formattedDate"
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: '#0f2a5e',
                        color: '#fff'
                      }}
                      labelFormatter={(label, items) => {
                        const dateObj = items[0]?.payload?.dateStr;
                        if (dateObj) {
                          const [year, month, day] = dateObj.split('-');
                          return `Data: ${day}/${month}/${year}`;
                        }
                        return `Data: ${label}`;
                      }}
                      itemStyle={{ color: '#fff', fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Treinamentos"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: 'currentColor', className: 'text-white dark:text-slate-900' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Seção de Gráficos de Performance dos Treinadores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CustomRechartsBarChart
              title="Nota Média por Treinador"
              data={chartMediaScore}
              dataKey="value"
              fill="#6366f1"
              name="Nota Média"
            />
            <CustomRechartsBarChart
              title="Quantidade de Documentações Aprovadas"
              data={chartApprovedDocs}
              dataKey="value"
              fill="#10b981"
              name="Aprovadas"
            />
            <CustomRechartsBarChart
              title="Atualização Relevante de Documentação"
              data={chartAttDocs}
              dataKey="value"
              fill="#0d9488"
              name="Atualizações"
            />
            <CustomRechartsBarChart
              title="Ferramenta ou Automação Aprovada"
              data={chartToolsApproved}
              dataKey="value"
              fill="#f59e0b"
              name="Ferramentas"
            />
            <CustomRechartsBarChart
              title="Chamados Decorrentes de Falha"
              data={chartFailureTickets}
              dataKey="value"
              fill="#ef4444"
              name="Chamados"
            />
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
                {dashboardStats.ranking.length === 0 ? (
                  <p className="text-center w-full italic text-slate-400 mt-20">Nenhum ponto registrado ainda.</p>
                ) : (
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
                )}
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
                Resumo por Colaborador (Pontuação)
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
                        <div className="flex flex-col items-center justify-center">
                          <span className={`text-sm font-black ${c.score >= 10 ? 'text-emerald-600' : c.score >= 0 ? 'text-slate-700 dark:text-slate-200' : 'text-red-500'}`}>
                            {c.score} pts
                          </span>
                          {c.bonusPercentage > 0 && (
                            <span className="text-[10px] font-bold text-emerald-500 mt-0.5">
                              (Base: {c.baseScore} +{c.bonusPercentage}% CSAT)
                            </span>
                          )}
                        </div>
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