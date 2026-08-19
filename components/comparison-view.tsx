'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/app-context';
import { calculateStats, DashboardStats, SupportData } from '@/lib/data-utils';
import {
  BarChart3,
  Calendar,
  FileText,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ThumbsUp,
  MessageSquare,
  Timer,
  Ticket,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';

interface BitrixTicketStats {
  opened: number;
  closed: number;
  avgDuracao: number;
}

// `avgDuracao` vem em minutos; convertida para a maior unidade legível
// (minutos < 1h, horas < 24h, dias e horas a partir daí).
function formatDuracao(minutes: number): string {
  if (minutes < 60) return `${minutes.toFixed(0)}m`;

  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1).replace('.0', '')}h`;

  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

interface ComparisonSlotProps {
  title: string;
  data: SupportData[];
  stats: DashboardStats | null;
  ticketStats: BitrixTicketStats | null;
  onFileSelect: (id: string) => void;
  onDateChange: (start: string, end: string) => void;
  selectedFile: string;
  startDate: string;
  endDate: string;
  mode: 'file' | 'date';
  setMode: (mode: 'file' | 'date') => void;
}

function ComparisonSlot({
  title,
  data,
  stats,
  ticketStats,
  onFileSelect,
  onDateChange,
  selectedFile,
  startDate,
  endDate,
  mode,
  setMode
}: ComparisonSlotProps) {
  const { uploads } = useApp();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">{title}</h3>
        
        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
          <button 
            onClick={() => setMode('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'file' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Por Arquivo
          </button>
          <button 
            onClick={() => setMode('date')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              mode === 'date' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Por Data
          </button>
        </div>

        {mode === 'file' ? (
          <select 
            value={selectedFile}
            onChange={(e) => onFileSelect(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-slate-100"
          >
            <option value="">Selecionar Arquivo...</option>
            {uploads.map(u => (
              <option key={u.id} value={u.id}>{u.filename} ({u.row_count} linhas)</option>
            ))}
          </select>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => onDateChange(e.target.value, endDate)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none dark:text-slate-100"
            />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => onDateChange(startDate, e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none dark:text-slate-100"
            />
          </div>
        )}
      </div>

      <div className="p-6 flex-1 space-y-6">
        {!stats ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Selecione um filtro para ver os dados</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Atendimentos</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.totalAtendimentos}</p>
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Avaliação</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.avgRating.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                  <Timer className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">1ª Resposta</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.avgResponseTime.toFixed(1)}m</p>
              </div>
              <div className="p-4 bg-purple-50/50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Duração</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{ticketStats ? formatDuracao(ticketStats.avgDuracao) : '---'}</p>
              </div>
              <div className="p-4 bg-amber-50/50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                  <Ticket className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Chamados Abertos</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{ticketStats?.opened ?? '---'}</p>
              </div>
              <div className="p-4 bg-teal-50/50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Chamados Fechados</span>
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{ticketStats?.closed ?? '---'}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Top 3 Colaboradores</h4>
              <div className="space-y-2">
                {stats.topEvaluatedCollaborators.slice(0, 3).map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-4">#{i+1}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[100px]">{c.name}</span>
                    </div>
                    <span className="text-xs font-black text-primary">{c.score.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Chamados Bitrix não têm uploadId, então no modo "Por Arquivo" o período usado
// para contá-los é o intervalo (menor/maior data) dos atendimentos daquele arquivo.
function getRowsDateRange(rows: SupportData[]): { start: Date; end: Date } | null {
  if (rows.length === 0) return null;
  let start = rows[0].data;
  let end = rows[0].data;
  for (const r of rows) {
    if (r.data < start) start = r.data;
    if (r.data > end) end = r.data;
  }
  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);
  return { start, end: endOfDay };
}

// `bitrixTickets` (via /api/app-data/bitrix-tickets) vem direto do banco em
// snake_case (created_at/updated_at/status), diferente do endpoint /api/tickets
// usado na tela de Tickets Bitrix, que mapeia para camelCase. Todas as métricas
// aqui giram em torno da data de abertura (created_at / "Criado em" no Bitrix):
// "Abertos" conta tudo criado no período; "Fechados" e "Duração Média" espelham
// a definição de "Resolvidos" da tela de Tickets Bitrix — status resolved/closed
// e criado no período (não a data de resolução).
//
// O Bitrix não expõe um timestamp explícito de "quando o status virou
// Resolvido", então, como já é feito na tela de Tickets Bitrix (avgResolutionTime),
// usamos `updated_at` como o momento da resolução do chamado.
function getBitrixTicketStats(tickets: any[], range: { start: Date; end: Date } | null) {
  if (!range) return null;
  const isWithinRange = (t: any) => {
    const created = new Date(t.created_at);
    return created >= range.start && created <= range.end;
  };
  const opened = tickets.filter(isWithinRange).length;
  const resolvedInRange = tickets.filter(t => (t.status === 'resolved' || t.status === 'closed') && isWithinRange(t) && t.created_at && t.updated_at);
  const closed = resolvedInRange.length;
  const avgDuracao = closed > 0
    ? resolvedInRange.reduce((acc, t) => acc + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()), 0) / closed / 60000
    : 0;
  return { opened, closed, avgDuracao };
}

export default function ComparisonView() {
  const { rawRows, bitrixTickets } = useApp();

  const [modeA, setModeA] = useState<'file' | 'date'>('file');
  const [fileA, setFileA] = useState('');
  const [dateA, setDateA] = useState({ start: '', end: '' });

  const [modeB, setModeB] = useState<'file' | 'date'>('file');
  const [fileB, setFileB] = useState('');
  const [dateB, setDateB] = useState({ start: '', end: '' });

  const rangeA = useMemo(() => {
    if (modeA === 'file') {
      if (!fileA) return null;
      return getRowsDateRange(rawRows.filter(r => r.uploadId === fileA));
    }
    if (!dateA.start || !dateA.end) return null;
    const start = new Date(dateA.start);
    const end = new Date(dateA.end);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [rawRows, modeA, fileA, dateA]);

  const rangeB = useMemo(() => {
    if (modeB === 'file') {
      if (!fileB) return null;
      return getRowsDateRange(rawRows.filter(r => r.uploadId === fileB));
    }
    if (!dateB.start || !dateB.end) return null;
    const start = new Date(dateB.start);
    const end = new Date(dateB.end);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [rawRows, modeB, fileB, dateB]);

  const statsA = useMemo(() => {
    let filtered = rawRows;
    if (modeA === 'file') {
      if (!fileA) return null;
      filtered = rawRows.filter(r => r.uploadId === fileA);
    } else {
      if (!rangeA) return null;
      filtered = rawRows.filter(r => r.data >= rangeA.start && r.data <= rangeA.end);
    }
    if (filtered.length === 0) return null;
    return calculateStats(filtered).dashboard;
  }, [rawRows, modeA, fileA, rangeA]);

  const statsB = useMemo(() => {
    let filtered = rawRows;
    if (modeB === 'file') {
      if (!fileB) return null;
      filtered = rawRows.filter(r => r.uploadId === fileB);
    } else {
      if (!rangeB) return null;
      filtered = rawRows.filter(r => r.data >= rangeB.start && r.data <= rangeB.end);
    }
    if (filtered.length === 0) return null;
    return calculateStats(filtered).dashboard;
  }, [rawRows, modeB, fileB, rangeB]);

  const ticketStatsA = useMemo(() => getBitrixTicketStats(bitrixTickets, rangeA), [bitrixTickets, rangeA]);
  const ticketStatsB = useMemo(() => getBitrixTicketStats(bitrixTickets, rangeB), [bitrixTickets, rangeB]);

  const diff = (valA: number, valB: number, inverse = false) => {
    // Sem base em nenhum dos dois períodos, não há o que comparar (ex: nenhum
    // chamado aberto em A e nenhum em B).
    if (!valA && !valB) return null;

    // Base zero só em A (ex: "Duração Média" ficando 0 porque o período não
    // tem dado de duração, ou nenhum chamado aberto/fechado em A) não permite
    // % (divisão por zero), mas B ainda é uma diferença real — antes isso
    // caía direto em "return null" e a tela mostrava "---" (lido como "vazio")
    // mesmo havendo dado em B para comparar. Mostra a variação em valor
    // absoluto nesse caso, em vez de esconder o campo inteiro.
    if (!valA) {
      const isPositive = valB > 0;
      return {
        value: Math.abs(valB).toFixed(1),
        isAbsolute: true,
        isPositive,
        isFlat: false,
        isGood: inverse ? !isPositive : isPositive,
        icon: isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
      };
    }

    const percentage = ((valB - valA) / valA) * 100;

    // Variação que arredonda para 0.0% não é nem alta nem queda. Antes disso
    // caía sempre no ramo "negativo" (percentage > 0 é falso quando é 0),
    // exibindo "-0.0%" com o rótulo "Queda" mesmo quando A e B eram
    // essencialmente iguais — o que o usuário lia como "a tela não calcula".
    const isFlat = Math.abs(percentage) < 0.05;
    const isPositive = percentage > 0;
    const isGood = isFlat ? null : (inverse ? !isPositive : isPositive);

    return {
      value: Math.abs(percentage).toFixed(1),
      isAbsolute: false,
      isPositive,
      isFlat,
      isGood,
      icon: isFlat
        ? <Minus className="w-3 h-3" />
        : (isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)
    };
  };

  const comparisons = [
    { label: 'Atendimentos', valA: statsA?.totalAtendimentos, valB: statsB?.totalAtendimentos, inverse: false },
    { label: 'Avaliação Média', valA: statsA?.avgRating, valB: statsB?.avgRating, inverse: false },
    { label: 'Tempo Resposta', valA: statsA?.avgResponseTime, valB: statsB?.avgResponseTime, inverse: true },
    { label: 'Duração Média', valA: ticketStatsA?.avgDuracao, valB: ticketStatsB?.avgDuracao, inverse: true },
    { label: 'Chamados Abertos', valA: ticketStatsA?.opened, valB: ticketStatsB?.opened, inverse: true },
    { label: 'Chamados Fechados', valA: ticketStatsA?.closed, valB: ticketStatsB?.closed, inverse: false },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Comparativo de Performance</h2>
          <p className="text-slate-500 dark:text-slate-400">Compare o desempenho entre diferentes arquivos ou períodos de tempo.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
        <div className="lg:col-span-5 h-full">
          <ComparisonSlot
            title="Período / Arquivo A"
            data={rawRows}
            stats={statsA}
            ticketStats={ticketStatsA}
            mode={modeA}
            setMode={setModeA}
            selectedFile={fileA}
            onFileSelect={setFileA}
            startDate={dateA.start}
            endDate={dateA.end}
            onDateChange={(start, end) => setDateA({ start, end })}
          />
        </div>

        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center gap-4 py-4 lg:py-20">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
            <ArrowRight className="w-5 h-5 rotate-90 lg:rotate-0" />
          </div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">VS</span>
        </div>

        <div className="lg:col-span-5 h-full">
          <ComparisonSlot
            title="Período / Arquivo B"
            data={rawRows}
            stats={statsB}
            ticketStats={ticketStatsB}
            mode={modeB}
            setMode={setModeB}
            selectedFile={fileB}
            onFileSelect={setFileB}
            startDate={dateB.start}
            endDate={dateB.end}
            onDateChange={(start, end) => setDateB({ start, end })}
          />
        </div>
      </div>

      {statsA && statsB && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 dark:bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-200 dark:shadow-none border border-white/5 dark:border-slate-800"
        >
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            Análise de Variação (A → B)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {comparisons.map((item) => {
              const d = diff(item.valA || 0, item.valB || 0, item.inverse);
              return (
                <div key={item.label} className="space-y-2">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</p>
                  <div className="flex items-end gap-3">
                    <p className="text-3xl font-black">
                      {!d ? '---' : d.isFlat ? `${d.value}%` : `${d.isPositive ? '+' : '-'}${d.value}${d.isAbsolute ? '' : '%'}`}
                    </p>
                    {d && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        d.isFlat ? 'bg-slate-500/20 text-slate-400' : d.isGood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {d.icon}
                        {d.isFlat ? 'Estável' : d.isGood ? 'Melhoria' : 'Queda'}
                      </div>
                    )}
                  </div>
                  <div className="w-full bg-white/10 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-4">
                    <div
                      className={`h-full transition-all duration-1000 ${!d || d.isFlat ? 'bg-slate-500' : d.isGood ? 'bg-emerald-400' : 'bg-rose-400'}`}
                      style={{ width: d ? `${Math.min(parseFloat(d.value), 100)}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-10 p-6 bg-white/5 dark:bg-slate-800/50 rounded-2xl border border-white/10 dark:border-slate-800">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Resumo do Comparativo
            </h4>
            <p className="text-slate-400 dark:text-slate-500 text-sm leading-relaxed">
              A comparação entre os períodos selecionados mostra uma variação de
              <span className="text-white font-bold mx-1">
                {diff(statsA.totalAtendimentos, statsB.totalAtendimentos)?.value ?? '0.0'}%
              </span>
              no volume de atendimentos.
              {statsB.avgRating > statsA.avgRating ?
                ' A qualidade percebida pelo cliente aumentou, refletindo uma melhoria nos processos.' :
                statsB.avgRating < statsA.avgRating ?
                ' Houve uma redução na nota média, sugerindo a necessidade de revisar os atendimentos deste período.' :
                ' A nota média se manteve estável entre os dois períodos.'
              }
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}