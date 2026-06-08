'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchTrainingCSV, 
  calculateTrainingStats, 
  TrainingRow, 
  TrainingDashboardStats,
  getWorkingDaysInMonth
} from '@/lib/training-utils';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/app-context';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  UserMinus, 
  Calendar,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  TrendingUp,
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  Database,
  ShieldAlert,
  Save,
  Edit2
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
import { motion, AnimatePresence } from 'motion/react';

interface TrainingConfig {
  id: string;
  name: string;
  url: string;
}

export default function TrainingDashboard() {
  const { userRole, user } = useApp();
  const isAdmin = userRole === 'admin' || user?.email?.toLowerCase() === 'admin@systemsat.com.br';
  
  const [configs, setConfigs] = useState<TrainingConfig[]>([]);
  const [stats, setStats] = useState<TrainingDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newConfig, setNewConfig] = useState({ name: '', url: '' });
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({});

  const fetchConfigs = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('training_configs')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data && data.length > 0) {
        setConfigs(data);
      } else {
        // Default initial set if empty
        setConfigs([
          { id: '1', name: 'Jeff', url: '' },
          { id: '2', name: 'Natalia', url: '' },
          { id: '3', name: 'Pedro', url: '' },
          { id: '4', name: 'Isabella', url: '' }
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching training configs:', err.message || err);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const refreshData = useCallback(async () => {
    const activeConfigs = configs.filter(c => c.url.trim() !== '');
    if (activeConfigs.length === 0) {
      setStats(null);
      setFetchErrors({});
      return;
    }

    setIsLoading(true);
    const newErrors: Record<string, string> = {};
    try {
      const allRows: TrainingRow[] = [];
      const results = await Promise.all(
        activeConfigs.map(async (config) => {
          try {
            const rows = await fetchTrainingCSV(config.url, config.name);
            return rows;
          } catch (err: any) {
            newErrors[config.name] = err.message || 'Erro desconhecido';
            return [];
          }
        })
      );
      
      results.forEach(rows => allRows.push(...rows));
      const calculatedStats = calculateTrainingStats(allRows);
      setStats(calculatedStats);
      setFetchErrors(newErrors);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing training data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [configs]);

  useEffect(() => {
    if (configs.length > 0) {
      refreshData();
    }
    // Polling every 1 minute
    const interval = setInterval(refreshData, 60000);
    return () => clearInterval(interval);
  }, [refreshData, configs.length]);

  const handleAddConfig = async () => {
    if (newConfig.name && newConfig.url) {
      let updatedConfigs;
      if (editingId) {
        updatedConfigs = configs.map(c => c.id === editingId ? { ...c, ...newConfig } : c);
        setEditingId(null);
      } else {
        updatedConfigs = [...configs, { id: Date.now().toString(), ...newConfig }];
      }
      setConfigs(updatedConfigs);
      setNewConfig({ name: '', url: '' });
      setIsAdding(false);
      
      // Auto-save
      await saveToSupabase(updatedConfigs);
    }
  };

  const handleEditConfig = (config: TrainingConfig) => {
    setNewConfig({ name: config.name, url: config.url });
    setEditingId(config.id);
    setIsAdding(true);
  };

  const handleRemoveConfig = async (id: string) => {
    const updatedConfigs = configs.filter(c => c.id !== id);
    setConfigs(updatedConfigs);
    await saveToSupabase(updatedConfigs);
  };

  const saveToSupabase = async (currentConfigs: TrainingConfig[]) => {
    if (!supabase) return;
    setIsSaving(true);
    try {
      // Clear existing and insert new (simple approach)
      const { error: deleteError } = await supabase
        .from('training_configs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      const toInsert = currentConfigs.map(({ name, url }) => ({ name, url }));
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('training_configs')
          .insert(toInsert);

        if (insertError) throw insertError;
      }
      
      await fetchConfigs();
    } catch (err: any) {
      console.error('Error saving configs to Supabase:', err.message || err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToSupabase = () => saveToSupabase(configs);

  const COLORS = {
    realizados: '#10b981', // Verde
    cancelados: '#f59e0b', // Amarelo
    ausentes: '#ef4444',    // Vermelho
    primary: '#3713ec'
  };

  const pieData = stats ? [
    { name: 'Realizados', value: stats.statusDistribution.realizados, color: COLORS.realizados },
    { name: 'Cancelados', value: stats.statusDistribution.cancelados, color: COLORS.cancelados },
    { name: 'Ausentes', value: stats.statusDistribution.ausentes, color: COLORS.ausentes }
  ] : [];

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
          {isAdmin && (
            <button 
              onClick={() => setIsAdding(true)}
              className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Configurar Fontes
            </button>
          )}
        </div>
      </div>

      {/* Configuration Modal/Panel */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold dark:text-slate-100">
                {editingId ? 'Editar Fonte de Dados' : 'Configurar Fontes de Dados (Google Sheets CSV)'}
              </h3>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setNewConfig({ name: '', url: '' });
                }} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <input 
                placeholder="Nome do Colaborador"
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none dark:text-slate-100"
                value={newConfig.name}
                onChange={e => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
              />
              <input 
                placeholder="Link CSV (Publicado na Web)"
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none md:col-span-2 dark:text-slate-100"
                value={newConfig.url}
                onChange={e => setNewConfig(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              {editingId && (
                <button 
                  onClick={() => {
                    setEditingId(null);
                    setNewConfig({ name: '', url: '' });
                    setIsAdding(false);
                  }}
                  className="px-6 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
              )}
              <button 
                onClick={handleAddConfig}
                className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-bold"
              >
                {editingId ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>

            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
              <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Fontes Ativas</h4>
              <div className="space-y-2">
                {configs.map(config => (
                  <div key={config.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-primary font-bold text-xs border border-slate-200 dark:border-slate-800">
                        {config.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-slate-200">{config.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[200px] md:max-w-md">{config.url || 'Sem link configurado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button onClick={() => handleEditConfig(config)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {config.url && (
                        <a href={config.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-primary transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleRemoveConfig(config.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                  setNewConfig({ name: '', url: '' });
                }}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-all"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Messages */}
      {Object.keys(fetchErrors).length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
            <ShieldAlert className="w-4 h-4" />
            Erros ao sincronizar dados:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(fetchErrors).map(([name, error]) => (
              <div key={name} className="text-xs text-red-500 dark:text-red-400 bg-white/50 dark:bg-slate-900/50 p-2 rounded-lg border border-red-50 dark:border-red-900/20">
                <span className="font-bold">{name}:</span> {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {!stats && !isLoading && (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-700">
            <Database className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Nenhuma fonte de dados configurada</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto italic">
            Clique em &quot;Configurar Fontes&quot; para adicionar os links CSV das guias do Google Sheets.
          </p>
          <button 
            onClick={() => setIsAdding(true)}
            className="text-primary font-bold hover:underline"
          >
            Configurar agora
          </button>
        </div>
      )}

      {isLoading && !stats && (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Sincronizando dados com Google Sheets...</p>
        </div>
      )}

      {stats && (
        <div className="space-y-8">
          {/* Top Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.totalRealizados}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Total Realizados</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.totalCancelados}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Total Cancelados</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
                  <UserMinus className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.totalAusentes}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Total Ausentes</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/5 text-primary rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{stats.totalAgendas}</p>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Total de Agendas</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Capacity Bar Chart */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold flex items-center gap-2 dark:text-slate-100">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Capacidade por Colaborador (%)
                </h3>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={stats.collaborators} 
                    layout="vertical"
                    margin={{ left: 40, right: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--grid-color, #f1f5f9)" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
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
                      formatter={(value: any) => [typeof value === 'number' ? `${value.toFixed(1)}%` : value, 'Capacidade']}
                    />
                    <Bar dataKey="capacityUsedPercent" radius={[0, 4, 4, 0]} barSize={24}>
                      {stats.collaborators.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.primary} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Pie Chart */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold flex items-center gap-2 dark:text-slate-100">
                  <PieChartIcon className="w-5 h-5 text-primary" />
                  Status dos Treinamentos
                </h3>
              </div>
              <div className="h-[300px] flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Main Summary Table */}
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
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Treinamentos</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Apoios Técnicos</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Tempo Total (h)</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Capacidade Utilizada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.collaborators.map((c) => (
                    <tr key={c.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-sm">
                            {c.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{c.trainingsCount}</td>
                      <td className="px-8 py-5 text-center font-medium text-slate-600 dark:text-slate-400">{c.techSupportCount}</td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-slate-900 dark:text-slate-100 font-bold">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          {c.totalTimeHours.toFixed(1)}h
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-sm font-black ${c.capacityUsedPercent > 80 ? 'text-red-600' : c.capacityUsedPercent > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {c.capacityUsedPercent.toFixed(1)}%
                          </span>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${c.capacityUsedPercent > 80 ? 'bg-red-500' : c.capacityUsedPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(c.capacityUsedPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
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