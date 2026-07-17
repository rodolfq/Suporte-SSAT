'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp, UserPermissions } from '@/context/app-context';
import { CollaboratorStats } from '@/lib/data-utils';
import dynamic from 'next/dynamic';

const FileUpload = dynamic(() => import('@/components/file-upload'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const Dashboard = dynamic(() => import('@/components/dashboard'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const RankingTable = dynamic(() => import('@/components/ranking-table'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const Filters = dynamic(() => import('@/components/filters'), { ssr: false });

const Settings = dynamic(() => import('@/components/settings'), { ssr: false });
const RawDataView = dynamic(() => import('@/components/raw-data-view'), { ssr: false });
const ComparisonView = dynamic(() => import('@/components/comparison-view'), { ssr: false });
const BitrixTicketsView = dynamic(() => import('@/components/bitrix-tickets-view'), { ssr: false });
const OdooTicketsView = dynamic(() => import('@/components/odoo-tickets-view'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const OdooTicketsDashboard = dynamic(() => import('@/components/odoo-tickets-dashboard'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const GeneralDashboard = dynamic(() => import('@/components/general-dashboard'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const BitrixTicketsDashboard = dynamic(() => import('@/components/bitrix-tickets-dashboard'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const TrainingDashboard = dynamic(() => import('@/components/training-dashboard'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const QueueDashboard = dynamic(() => import('@/components/queue-dashboard'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });
const KnowledgeBase = dynamic(() => import('@/components/knowledge-base'), { ssr: false, loading: () => <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> });

import Login from '@/components/login';
import { ThemeToggle } from '@/components/theme-toggle';

import { 
  LayoutDashboard, 
  MessageSquare, 
  BarChart3, 
  Users, 
  Settings as SettingsIcon, 
  Plus, 
  Search, 
  Bell, 
  Menu,
  X,
  Download,
  Database,
  ArrowLeftRight,
  Ticket,
  LogOut,
  Loader2,
  PieChart,
  Activity,
  TrendingUp,
  ShieldAlert,
  GraduationCap,
  CloudUpload,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Page() {
  const { 
    dashboard, 
    collaborators, 
    selectedRows, 
    resetData, 
    error, 
    clearError,
    user,
    userRole,
    userPermissions,
    isAuthReady,
    refreshSession
  } = useApp();
  
  const [view, setView] = useState<'upload' | 'dashboard' | 'ranking' | 'settings' | 'rawData' | 'comparison' | 'bitrixTickets' | 'odooTickets' | 'odooDashboard' | 'general' | 'trainingDashboard' | 'bitrixDashboard' | 'queue' | 'knowledgeBase'>('general');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [filterCollabs, setFilterCollabs] = useState<string[]>([]);

  const hasPermission = useCallback((permission: keyof UserPermissions) => {
    const isSuperAdmin = user?.email?.toLowerCase() === 'admin@systemsat.com.br';
    const hasPerm = userPermissions?.[permission] === true;
    
    // Log apenas para depuração do usuário específico
    if (user?.email?.toLowerCase() === 'usr@systemsat.com.br') {
      console.log(`Verificando permissão [${permission}] para usr@systemsat.com.br:`, hasPerm);
    }
    
    if (isSuperAdmin) return true;
    return hasPerm;
  }, [user, userPermissions]);

  // Redirect to general if user doesn't have permission for current view
  useEffect(() => {
    if (!isAuthReady || !user || !userPermissions) return;

    const permissionMap: Record<string, keyof UserPermissions> = {
      'general': 'view_general',
      'dashboard': 'view_tickets_dash',
      'odooDashboard': 'view_odoo_dash',
      'bitrixDashboard': 'view_metrics',
      'comparison': 'view_comparison',
      'ranking': 'view_ranking',
      'rawData': 'view_raw_data',
      'bitrixTickets': 'view_bitrix_tickets',
      'odooTickets': 'view_odoo_tickets',
      'trainingDashboard': 'view_training',
      'knowledgeBase': 'view_training',
      'upload': 'upload_data',
      'settings': 'manage_users'
    };

    const requiredPermission = permissionMap[view];
    if (requiredPermission && !hasPermission(requiredPermission)) {
      if (view !== 'general' && hasPermission('view_general')) {
        setView('general');
      }
    }
  }, [view, userPermissions, isAuthReady, user, hasPermission]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await refreshSession();
      setView('general');
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando sua sessão...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Permissions load asynchronously right after `user` is set (see
  // fetchProfile in app-context.tsx). Without this gate, the view briefly
  // renders with userPermissions still null, so hasPermission() returns
  // false for everything and "Acesso Restrito" flashes before permissions
  // arrive a moment later.
  if (!userPermissions) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando permissões...</p>
      </div>
    );
  }

  const handleUploadComplete = () => {
    setView('dashboard');
  };

  const filteredCollaborators = filterCollabs.length > 0 
    ? collaborators.filter(c => filterCollabs.includes(c.name))
    : collaborators;

  const availableCollabNames = collaborators.map(c => c.name);

  const exportFullReport = () => {
    if (collaborators.length === 0) return;

    const headers = ['Posição', 'Colaborador', 'Pontos', 'Score', 'Avaliação', 'Tempo Médio Resposta', 'Atendimentos'];
    const rows = [...collaborators]
      .sort((a, b) => (a.rank || 0) - (b.rank || 0))
      .map(c => [
        c.rank,
        c.name,
        c.totalPoints,
        c.score.toFixed(1),
        c.avgRating.toFixed(1),
        c.avgResponseTime.toFixed(1),
        c.totalAtendimentos
      ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_performance_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-50"
          >
            <div className="p-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-sm font-bold leading-tight dark:text-slate-100">Performance</h1>
              </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dashboards</p>
              </div>
              {hasPermission('view_general') && (
                <button
                  onClick={() => setView('general')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    view === 'general' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                  <span className="text-sm">Geral</span>
                </button>
              )}
              {hasPermission('view_tickets_dash') && (
                <button
                  onClick={() => setView('dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    view === 'dashboard' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm">Chat Dashboard</span>
                </button>
              )}
              {hasPermission('view_odoo_dash') && (
                <button
                  onClick={() => setView('odooDashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    view === 'odooDashboard' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-sm">Odoo Dashboard</span>
                </button>
              )}
              {hasPermission('view_training') && (
                <div className="space-y-1">
                  <button
                    onClick={() => setView('trainingDashboard')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      view === 'trainingDashboard' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span className="text-sm">Treinamento</span>
                  </button>
                  <button
                    onClick={() => setView('knowledgeBase')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 pl-10 rounded-xl transition-all ${
                      view === 'knowledgeBase' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs">Base de Conhecimento</span>
                  </button>
                </div>
              )}
              {hasPermission('view_metrics') && (
                <button
                  onClick={() => setView('bitrixDashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    view === 'bitrixDashboard' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <PieChart className="w-5 h-5" />
                  <span className="text-sm">Dashboard Bitrix</span>
                </button>
              )}

              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Atendimento</p>
              </div>
              {hasPermission('view_queue') && (
                <button
                  onClick={() => setView('queue')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    view === 'queue' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="text-sm">Fila de Atendimento</span>
                </button>
              )}
              {hasPermission('view_comparison') && (
                <button
                  onClick={() => setView('comparison')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    view === 'comparison' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <ArrowLeftRight className="w-5 h-5" />
                  <span className="text-sm">Comparativo</span>
                </button>
              )}
              {hasPermission('view_ranking') && (
                <button
                  onClick={() => setView('ranking')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    view === 'ranking' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-sm">Ranking atendimento</span>
                </button>
              )}
              {hasPermission('view_raw_data') && (
                <button
                  onClick={() => setView('rawData')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    view === 'rawData' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Database className="w-5 h-5" />
                  <span className="text-sm">Dados Brutos</span>
                </button>
              )}

              {(hasPermission('view_odoo_tickets') || hasPermission('view_bitrix_tickets')) && (
                <>
                  <div className="pt-4 pb-2 px-3">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Tickets</p>
                  </div>
                  {hasPermission('view_odoo_tickets') && (
                    <button
                      onClick={() => setView('odooTickets')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        view === 'odooTickets' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Ticket className="w-5 h-5" />
                      <span className="text-sm">Tickets Odoo</span>
                    </button>
                  )}
                  {hasPermission('view_bitrix_tickets') && (
                    <button
                      onClick={() => setView('bitrixTickets')}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        view === 'bitrixTickets' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <PieChart className="w-5 h-5" />
                      <span className="text-sm">Tickets Bitrix</span>
                    </button>
                  )}
                </>
              )}

              <div className="pt-4 pb-2 px-3">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sistema</p>
              </div>
              <button 
                onClick={() => setView('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  view === 'settings' ? 'bg-primary/10 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                } ${!(userRole === 'admin' || user?.email?.toLowerCase() === 'admin@systemsat.com.br') ? 'hidden' : ''}`}
              >
                <SettingsIcon className="w-5 h-5" />
                <span className="text-sm">Configurações</span>
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 mt-2"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-bold">Sair</span>
              </button>

              {/* Dynamic Collaborator List in Sidebar */}
              {collaborators.length > 0 && (
                <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-3 mb-4 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Colaboradores</h3>
                  </div>
                  <div className="space-y-1">
                    {collaborators.map((c) => (
                      <label 
                        key={c.name} 
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                          filterCollabs.includes(c.name) ? 'bg-primary/5 text-primary' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={filterCollabs.includes(c.name)}
                          onChange={() => {
                            setFilterCollabs(prev => 
                              prev.includes(c.name) ? prev.filter(n => n !== c.name) : [...prev, c.name]
                            );
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-primary focus:ring-primary w-3.5 h-3.5"
                        />
                        <span className="text-xs font-medium truncate">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800">
              {hasPermission('upload_data') && (
                <button 
                  onClick={() => { resetData(); setView('upload'); }}
                  className="w-full bg-primary text-white py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all mb-4"
                >
                  <Plus className="w-4 h-4" />
                  Novo Upload
                </button>
              )}
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Alpha v0.1.0</p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-600 text-white px-8 py-3 flex items-center justify-between z-50"
            >
              <div className="flex items-center gap-3">
                <X className="w-5 h-5 cursor-pointer" onClick={clearError} />
                <p className="text-sm font-bold">{error}</p>
              </div>
              <button 
                onClick={() => setView('settings')}
                className="text-xs font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all"
              >
                Ver Configurações
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Debug Panel (Visível para todos temporariamente para resolver o problema) */}
     

        {/* Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500 dark:text-slate-400"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h2 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
              {view === 'upload' || (view === 'dashboard' && !dashboard) ? 'Importar Dados' : 
               view === 'general' ? 'Dashboard Geral' :
               view === 'dashboard' ? 'Chat Dashboard' : 
               view === 'ranking' ? 'Ranking Atendimento' : 
               view === 'rawData' ? 'Dados Brutos da Planilha' : 
               view === 'comparison' ? 'Comparativo de Atendimento' : 
               view === 'bitrixTickets' ? 'Tickets (Bitrix)' : 
               view === 'odooTickets' ? 'Tickets (Odoo)' : 
               view === 'odooDashboard' ? 'Dashboard (Odoo)' : 
               view === 'bitrixDashboard' ? 'Dashboard (Bitrix)' : 
               view === 'trainingDashboard' ? 'Treinamento' : 
               view === 'knowledgeBase' ? 'Base de Conhecimento' : 'Configurações'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                className="pl-10 pr-4 py-2 w-64 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/30 transition-all" 
                placeholder="Buscar métricas..." 
                type="text" 
              />
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                <Bell className="w-5 h-5" />
              </button>
              <div className="h-9 w-9 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                {user?.email?.substring(0, 2).toUpperCase() || 'US'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className={`flex-1 ${view === 'knowledgeBase' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'} p-4 md:p-6 relative`}>
          <div className={`w-full mx-auto ${view === 'knowledgeBase' ? 'max-w-7xl flex-1 flex flex-col min-h-0 pt-2 pb-6' : 'max-w-full px-8 space-y-8'}`}>
            {/* View: No Access */}
            {(!hasPermission('view_general') && view === 'general') && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
                  <ShieldAlert className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Acesso Restrito</h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                  Você não tem permissão para visualizar esta tela. Entre em contato com o administrador para solicitar acesso.
                </p>
                <button 
                  onClick={handleLogout}
                  className="mt-8 px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-all"
                >
                  Sair da Conta
                </button>
              </div>
            )}

            {(view === 'upload' || (view === 'dashboard' && !dashboard)) && hasPermission('upload_data') && (
              <div className="space-y-12 max-w-5xl mx-auto py-8">
                <div className="relative p-10 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden group">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-48 -mt-48 blur-[100px] group-hover:bg-primary/20 transition-all duration-1000" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full -ml-32 -mb-32 blur-[80px]" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="max-w-2xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                        <Activity className="w-3 h-3" />
                        Plataforma de Inteligência
                      </div>
                      <h1 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight mb-6 leading-[1.1]">
                        Análise de Performance <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 dark:from-primary dark:to-blue-400">do Suporte</span>
                      </h1>
                      <p className="text-slate-500 dark:text-slate-400 text-xl leading-relaxed font-medium">
                        Transforme seus dados de atendimento em insights acionáveis. Faça o upload da sua planilha para começar a monitorar o desempenho da sua equipe.
                      </p>
                    </div>
                    <div className="hidden lg:block shrink-0">
                      <div className="w-48 h-48 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex items-center justify-center relative">
                        <div className="absolute inset-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-2xl" />
                        <CloudUpload className="w-16 h-16 text-primary/40" />
                      </div>
                    </div>
                  </div>
                </div>
                <FileUpload onComplete={handleUploadComplete} />
              </div>
            )}

            {view === 'general' && hasPermission('view_general') && <GeneralDashboard />}
            {view === 'dashboard' && dashboard && hasPermission('view_tickets_dash') && (
              <div className="space-y-8">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Análise de Performance</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Visão detalhada e comparativa da performance da equipe.</p>
                  </div>
                  {hasPermission('export_reports') && (
                    <button 
                      onClick={exportFullReport}
                      className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Exportar Relatório
                    </button>
                  )}
                </div>
                <Dashboard 
                  filteredCollaborators={filteredCollaborators} 
                  onViewRanking={() => setView('ranking')}
                />
              </div>
            )}

            {view === 'ranking' && dashboard && hasPermission('view_ranking') && (
              <div className="space-y-8">
                <div>
                  <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Ranking Atendimento</h1>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">Acompanhamento dos melhores desempenhos do mês.</p>
                </div>
                <RankingTable onSelect={() => {}} filteredCollaborators={filteredCollaborators} />
              </div>
            )}

            {view === 'comparison' && hasPermission('view_comparison') && (
              <ComparisonView />
            )}

            {view === 'rawData' && hasPermission('view_raw_data') && (
              <RawDataView onBack={() => setView('upload')} />
            )}

            {view === 'bitrixTickets' && hasPermission('view_bitrix_tickets') && (
              <BitrixTicketsView />
            )}

            {view === 'odooTickets' && hasPermission('view_odoo_tickets') && (
              <OdooTicketsView />
            )}

            {view === 'odooDashboard' && hasPermission('view_odoo_dash') && (
              <OdooTicketsDashboard />
            )}

            {view === 'trainingDashboard' && hasPermission('view_training') && (
              <TrainingDashboard />
            )}

            {view === 'knowledgeBase' && hasPermission('view_training') && (
              <div className="flex-1 flex flex-col min-h-0">
                <KnowledgeBase />
              </div>
            )}

            {view === 'bitrixDashboard' && hasPermission('view_metrics') && (
              <BitrixTicketsDashboard />
            )}

            {view === 'queue' && hasPermission('view_queue') && (
              <QueueDashboard />
            )}

            {view === 'settings' && (userRole === 'admin' || user?.email?.toLowerCase() === 'admin@systemsat.com.br') && (
              <Settings />
            )}
          </div>

          {/* Background Pattern */}
          <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#3713ec 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        </main>

        {/* Filters Panel Overlay */}
        <AnimatePresence>
          {showFilters && (
            <div className="absolute inset-0 z-50 flex justify-end">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilters(false)}
                className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" 
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="relative"
              >
                <Filters 
                  onApply={(f) => {
                    setFilterCollabs(f.collaborators);
                    setShowFilters(false);
                  }} 
                  availableCollaborators={availableCollabNames}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>


      </div>
    </div>
  );
}