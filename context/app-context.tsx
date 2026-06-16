'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { SupportData, CollaboratorStats, DashboardStats, calculateStats, RawSpreadsheetRow, RankingPointsConfig } from '@/lib/data-utils';
import { supabase } from '@/lib/supabase';
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  isWithinInterval
} from 'date-fns';

interface UploadRecord {
  id: string;
  filename: string;
  created_at: string;
  row_count: number;
}

export interface UserPermissions {
  // Telas
  view_general: boolean;
  view_tickets_dash: boolean;
  view_odoo_dash: boolean;
  view_comparison: boolean;
  view_ranking: boolean;
  view_raw_data: boolean;
  view_odoo_tickets: boolean;
  view_bitrix_tickets: boolean;
  view_metrics: boolean;
  view_performance_charts: boolean;
  view_sla_metrics: boolean;
  view_satisfaction_data: boolean;
  view_training: boolean;
  view_queue: boolean;
  
  // Ações
  upload_data: boolean;
  manage_users: boolean;
  export_reports: boolean;
  sync_external_data: boolean;
  delete_data: boolean;
  edit_collaborators: boolean;
}

interface AppState {
  rawRows: SupportData[];
  rawSpreadsheetData: RawSpreadsheetRow[];
  collaborators: CollaboratorStats[];
  dashboard: DashboardStats | null;
  periodDashboard: DashboardStats | null;
  totalDashboard: DashboardStats | null;
  selectedRows: SupportData[];
  bitrixTickets: any[];
  odooTickets: any[];
  uploads: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: 'all' | 'included' | 'excluded';
  setFilterStatus: (status: 'all' | 'included' | 'excluded') => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  customRange: { start: string; end: string };
  setCustomRange: (range: { start: string; end: string } | ((prev: { start: string; end: string }) => { start: string; end: string })) => void;
  dateRange: { start: Date; end: Date };
  columnFilters: { collaborators: string[]; clients: string[]; rating: number | null; messagesMin: number | null };
  setColumnFilter: (key: string, value: any) => void;
  clearColumnFilters: () => void;
  error: string | null;
  isLoading: boolean;
  importLogs: any[];
  importIndicators: { totalImported: number; totalIgnored: number; totalProcessed: number; totalDuplicates: number } | null;
  setRawData: (data: SupportData[], allRows: SupportData[], filename?: string, rawData?: RawSpreadsheetRow[], source?: 'chat' | 'odoo' | 'bitrix', indicators?: any, logs?: any[]) => Promise<void>;
  setOdooTicketsData: (tickets: any[], filename: string) => Promise<void>;
  syncOdooTickets: (apiKey?: string) => Promise<any[]>;
  syncBitrixTickets: () => Promise<void>;
  resetData: () => void;
  clearAllData: () => Promise<void>;
  deleteUpload: (id: string) => Promise<void>;
  deleteCollaborator: (name: string) => Promise<void>;
  toggleRowExclusion: (rowId: string, exclude: boolean, reason?: string) => Promise<void>;
  updateRowNote: (rowId: string, note: string) => Promise<void>;
  updateCollaboratorAvatar: (name: string, avatarUrl: string, options?: any) => Promise<void>;
  updateCollaboratorBadges: (name: string, badges: string[]) => Promise<void>;
  updateCollaboratorGoals: (name: string, goals: any[]) => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
  user: any | null;
  userRole: string | null;
  userPermissions: UserPermissions | null;
  isAuthReady: boolean;
  supabase: any;
  dashboardLayout: any[] | null;
  queueLayout: any[] | null;
  settingsLayout: any[] | null;
  dashboardLayouts: any[];
  selectedLayoutId: string | null;
  updateDashboardLayout: (layout: any[]) => Promise<void>;
  updateQueueLayout: (layout: any[]) => Promise<void>;
  updateSettingsLayout: (layout: any[]) => Promise<void>;
  saveDashboardLayout: (name: string, layout: any[], isDefault?: boolean) => Promise<void>;
  deleteDashboardLayout: (id: string) => Promise<void>;
  selectDashboardLayout: (id: string) => Promise<void>;
  
  // Bitrix Timeman
  bitrixUsers: any[];
  bitrixSchedules: any[];
  loadingBitrix: boolean;
  fetchBitrixTimeman: (retryCount?: number) => Promise<void>;
  fetchBitrixSchedules: (retryCount?: number) => Promise<void>;
  handleTimemanAction: (userId: string, action: 'close' | 'pause' | 'open') => Promise<void>;
  lastKnownDurations: Record<string, string>;

  // Points Rules Config
  pointsConfig: RankingPointsConfig;
  updatePointsConfig: (config: RankingPointsConfig) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const basePermissions: UserPermissions = {
  view_general: false,
  view_tickets_dash: false,
  view_odoo_dash: false,
  view_comparison: false,
  view_ranking: false,
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

export function AppProvider({ children }: { children: ReactNode }) {

  const [rawRows, setRawRows] = useState<SupportData[]>([]);
  const [rawSpreadsheetData, setRawSpreadsheetData] = useState<RawSpreadsheetRow[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorStats[]>([]);
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [periodDashboard, setPeriodDashboard] = useState<DashboardStats | null>(null);
  const [totalDashboard, setTotalDashboard] = useState<DashboardStats | null>(null);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [selectedRows, setSelectedRows] = useState<SupportData[]>([]);
  const [bitrixTickets, setBitrixTickets] = useState<any[]>([]);
  const [odooTickets, setOdooTickets] = useState<any[]>([]);
const [pointsConfig, setPointsConfig] = useState<RankingPointsConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ranking_points_config');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing loaded points config:', e);
        }
      }
    }
    return {
      volume: 1,
      fiveStars: 10,
      oneStar: -90,
      speedUnder1m: 5,
      speedUnder3m: 0.5,
      speedOver3m: -1,
      volumeLimit: 0,
      responseRateBonusTiers: [
        { id: '1', minPercentage: 20, bonusPoints: 10 },
        { id: '2', minPercentage: 25, bonusPoints: 20 },
        { id: '3', minPercentage: 30, bonusPoints: 30 }
      ]
    };
  });

  const updatePointsConfig = (newConfig: RankingPointsConfig) => {
    setPointsConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ranking_points_config', JSON.stringify(newConfig));
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'included' | 'excluded'>('included');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const [importIndicators, setImportIndicators] = useState<{ totalImported: number; totalIgnored: number; totalProcessed: number; totalDuplicates: number } | null>(null);
  
  const getDateRange = (filter: string, custom: { start: string; end: string }) => {
    const now = new Date();
    
    const parseLocalDate = (dateStr: string) => {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    switch (filter) {
      case 'all':
        return { start: new Date(0), end: new Date(8640000000000000) };
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'week':
        return { start: subDays(startOfDay(now), 7), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subDays(startOfMonth(now), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'year':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        const customStart = parseLocalDate(custom.start);
        const customEnd = parseLocalDate(custom.end);
        return { 
          start: customStart ? startOfDay(customStart) : startOfMonth(now), 
          end: customEnd ? endOfDay(customEnd) : endOfMonth(now) 
        };
      default:
        return { start: new Date(0), end: new Date(8640000000000000) };
    }
  };

  const dateRange = useMemo(() => getDateRange(dateFilter, customRange), [dateFilter, customRange]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarMap, setAvatarMap] = useState<Map<string, { url: string, options: any, badges?: string[], goals?: any[] }>>(new Map());

const [columnFilters, setColumnFilters] = useState({
  collaborators: [] as string[],
  clients: [] as string[],
  rating: null as number | null,
  messagesMin: null as number | null
});

const setColumnFilter = (key: string, value: any) => {
  setColumnFilters(prev => ({ ...prev, [key]: value }));
};

const clearColumnFilters = () => {
  setColumnFilters({
    collaborators: [],
    clients: [],
    rating: null,
    messagesMin: null
  });
};


  
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [dashboardLayout, setDashboardLayout] = useState<any[] | null>(null);
  const [queueLayout, setQueueLayout] = useState<any[] | null>(null);
  const [settingsLayout, setSettingsLayout] = useState<any[] | null>(null);
  const [dashboardLayouts, setDashboardLayouts] = useState<any[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const userRef = React.useRef(user);

  // Bitrix Timeman State
  const [bitrixUsers, setBitrixUsers] = useState<any[]>([]);
  const [bitrixSchedules, setBitrixSchedules] = useState<any[]>([]);
  const [loadingBitrix, setLoadingBitrix] = useState(false);
  const [lastKnownDurations, setLastKnownDurations] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bitrix_last_durations');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const fetchBitrixTimeman = useCallback(async (retryCount = 0) => {
    if (userRole !== 'admin') return;
    setLoadingBitrix(true);
    try {
      const response = await fetch('/api/bitrix/timeman');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.users) {
        setBitrixUsers(data.users);
        
        // Update last known durations
        setLastKnownDurations(prev => {
          const next = { ...prev };
          let changed = false;
          data.users.forEach((user: any) => {
            if (user.duration && user.duration !== '--:--:--' && user.duration !== '00:00:00') {
              if (next[user.id] !== user.duration) {
                next[user.id] = user.duration;
                changed = true;
              }
            }
          });
          if (changed && typeof window !== 'undefined') {
            localStorage.setItem('bitrix_last_durations', JSON.stringify(next));
          }
          return next;
        });
      }
    } catch (err: any) {
      console.error('Error fetching bitrix timeman:', err);
      if (err.message === 'Failed to fetch' && retryCount < 2) {
        setTimeout(() => fetchBitrixTimeman(retryCount + 1), 2000);
      }
    } finally {
      setLoadingBitrix(false);
    }
  }, [userRole]);

  const fetchBitrixSchedules = useCallback(async (retryCount = 0) => {
    if (userRole !== 'admin') return;
    try {
      const response = await fetch('/api/bitrix/schedules');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.schedules) {
        setBitrixSchedules(data.schedules);
      }
    } catch (err: any) {
      console.error('Error fetching bitrix schedules:', err);
      if (err.message === 'Failed to fetch' && retryCount < 2) {
        setTimeout(() => fetchBitrixSchedules(retryCount + 1), 2000);
      }
    }
  }, [userRole]);

  const handleTimemanAction = useCallback(async (userId: string, action: 'close' | 'pause' | 'open') => {
    try {
      const response = await fetch('/api/bitrix/timeman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        fetchBitrixTimeman();
      } else {
        throw new Error(data.error || 'Erro ao realizar ação');
      }
    } catch (err: any) {
      console.error('Error in timeman action:', err);
      throw err;
    }
  }, [fetchBitrixTimeman]);

  useEffect(() => {
    if (userRole === 'admin') {
      fetchBitrixTimeman();
      fetchBitrixSchedules();
    }
  }, [userRole, fetchBitrixTimeman, fetchBitrixSchedules]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isSupabaseConfigured =
    !!supabase &&
    !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  const parseNumber = (v: any) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const logError = (label: string, err: any) => {
    console.error(label, err);
    try {
      // Use a safer stringify to avoid circular reference issues
      const cache = new Set();
      const safeJson = JSON.stringify(err, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) return '[Circular]';
          cache.add(value);
        }
        return value;
      }, 2);
      console.error('Full error details:', safeJson);

      // Specific check for PGRST204 (schema cache issue)
      if (err?.code === 'PGRST204' || (typeof err === 'string' && err.includes('PGRST204'))) {
        console.error('PostgREST Schema Cache Error detected. This usually means a column was added but the cache hasn\'t refreshed.');
      }
    } catch (e) {
      console.error('Error stringify failed, logging raw error object:', err);
    }
  };

  // Connection test for Supabase
  useEffect(() => {
    const testConnection = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { error } = await supabase.from('uploads').select('id').limit(1);
          if (error) {
            console.error('Supabase Connection Test Error:', error);
            if (error.code === 'PGRST204') {
              setError('Erro de cache no banco de dados. Por favor, aguarde alguns instantes e tente novamente.');
            } else if (error.message?.includes('Unregistered API key')) {
              setError('Supabase: Chave de API não registrada para este projeto (Unregistered API key). Verifique se a URL e a Anon Key coincidem no painel Settings/Secrets.');
            } else {
              setError(`Erro de conexão Supabase: ${error.message}`);
            }
          } else {
            console.log('Supabase Connection Test: Success');
          }
        } catch (err) {
          console.error('Supabase Connection Test Exception:', err);
        }
      }
    };
    testConnection();
  }, [isSupabaseConfigured]);

  const fetchDashboardLayouts = useCallback(async (userId: string) => {
    const supabaseClient = supabase;
    if (!supabaseClient) return;

    try {
      const { data, error } = await supabaseClient
        .from('dashboard_layouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn('Table dashboard_layouts does not exist yet.');
          return;
        }
        throw error;
      }
      setDashboardLayouts(data || []);
      
      // If no layout is selected, use the default one or the first one
      const defaultLayout = data?.find(l => l.is_default) || data?.[0];
      if (defaultLayout && !dashboardLayout) {
        setDashboardLayout(defaultLayout.layout);
      }
    } catch (err) {
      console.error('Error fetching dashboard layouts:', err);
    }
  }, [dashboardLayout]);

  // Auth and Profile Handling
  useEffect(() => {
    const supabaseClient = supabase;
    if (!supabaseClient) {
      setIsAuthReady(true);
      return;
    }

    const fetchProfile = async (userId: string, email?: string) => {
      try {
        // Fetch layouts first
        await fetchDashboardLayouts(userId);
        // Se for o admin principal, sempre dar todas as permissões
        if (email?.toLowerCase() === 'admin@systemsat.com.br') {
          console.log('Super Admin detectado:', email);
          setUserRole('admin');
          setUserPermissions({
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
          });
          return;
        }

        const { data: profiles, error: profileError } = await supabaseClient
          .from('profiles')
          .select('role, permissions, dashboard_layout, queue_layout, settings_layout')
          .eq('id', userId);
        
        let profile = profiles && profiles.length > 0 ? profiles[0] : null;

        // Se não achou por ID, tenta por email (fallback para usuários antigos)
        if (!profile && email) {
          const { data: emailProfiles } = await supabaseClient
            .from('profiles')
            .select('role, permissions, dashboard_layout, queue_layout, settings_layout')
            .eq('email', email);
          if (emailProfiles && emailProfiles.length > 0) {
            profile = emailProfiles[0];
          }
        }
        
        if (!profile) {
          console.log('Perfil não encontrado no banco para:', email || userId, '- Usando permissões restritas.');
          setUserRole('user');
          setUserPermissions({
            ...basePermissions,
            view_general: true // Apenas tela geral por padrão para novos usuários
          });
          setDashboardLayout(null);
          setQueueLayout(null);
        } else {
          console.log('Perfil carregado com sucesso para:', email, 'Role:', profile.role);
          setUserRole(profile.role || 'user');
          setDashboardLayout(profile.dashboard_layout || null);
          setQueueLayout(profile.queue_layout || null);
          setSettingsLayout(profile.settings_layout || null);
          
          // Garantir que permissões sejam um objeto válido
          const dbPermissions = typeof profile.permissions === 'object' && profile.permissions !== null 
            ? profile.permissions 
            : {};

          const mergedPermissions = {
            ...basePermissions,
            ...dbPermissions
          };
          
          console.log('Permissões finais aplicadas:', mergedPermissions);
          setUserPermissions(mergedPermissions);
        }
      } catch (err: any) {
        console.error('Erro ao buscar perfil:', err);
        setUserRole('user');
        setUserPermissions(basePermissions);
      }
    };

    const setupSession = async () => {
      try {
        // Tenta obter a sessão atual
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          const isInvalidToken = error.message?.includes('Invalid Refresh Token') || 
                                error.message?.includes('Refresh Token Not Found');
          
          if (isInvalidToken) {
            console.warn('Sessão expirada ou inválida detectada. Limpando estado local.');
            // Limpa o localStorage manualmente para evitar que o SDK tente usar o token novamente
            if (typeof window !== 'undefined') {
              localStorage.removeItem('systemsat-auth-token');
            }
            await supabaseClient.auth.signOut().catch(() => {});
            setUser(null);
            setUserRole(null);
            setUserPermissions(null);
          } else {
            console.warn('Erro ao recuperar sessão inicial:', error.message);
          }
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id, currentUser.email);
        }
      } catch (err: any) {
        console.error('Erro inesperado na configuração da sessão:', err);
      } finally {
        setIsAuthReady(true);
      }
    };

    setupSession();
    
    // Realtime subscription para o perfil do usuário logado
    let profileSubscription: any = null;

    const setupProfileSubscription = (userId: string) => {
      if (profileSubscription) profileSubscription.unsubscribe();

      profileSubscription = supabaseClient
        .channel(`public:profiles:id=eq.${userId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'profiles',
          filter: `id=eq.${userId}`
        }, (payload) => {
          console.log('Perfil atualizado em tempo real:', payload.new);
          setUserRole(payload.new.role || 'user');
          const merged = {
            ...basePermissions,
            ...(payload.new.permissions || {})
          };
          setUserPermissions(merged);
        })
        .subscribe();
    };

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      console.log('Auth State Change Event:', event);
      const currentUser = session?.user ?? null;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(currentUser);
        if (currentUser) {
          fetchProfile(currentUser.id, currentUser.email);
          setupProfileSubscription(currentUser.id);
        }
      } else if (event === 'SIGNED_OUT') {
        // Pequeno delay para garantir que não é um falso positivo durante refresh
        setTimeout(async () => {
          const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
          if (!currentSession) {
            setUser(null);
            setUserRole(null);
            setUserPermissions(null);
            if (profileSubscription) profileSubscription.unsubscribe();
          }
        }, 1000);
      } else if (event === 'USER_UPDATED') {
        setUser(currentUser);
      }
    });

    // Heartbeat para manter a sessão ativa e verificar validade periodicamente
    const sessionCheckInterval = setInterval(async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          const errMsg = error.message || '';
          if (errMsg.includes('Invalid Refresh Token') || errMsg.includes('Refresh Token Not Found')) {
            console.error('Sessão invalidada (Refresh Token inválido). Forçando logout.');
            // Limpa o localStorage para evitar loops
            if (typeof window !== 'undefined') {
              localStorage.removeItem('systemsat-auth-token');
            }
            await supabaseClient.auth.signOut().catch(() => {});
            setUser(null);
            setUserRole(null);
            setUserPermissions(null);
            return;
          }
          throw error;
        }

        if (session && session.expires_at) {
          const expiresAt = session.expires_at * 1000;
          const now = Date.now();
          // Se faltar menos de 10 minutos para expirar, força um refresh
          if (expiresAt - now < 10 * 60 * 1000) {
            console.log('Sessão próxima de expirar, renovando...');
            const { error: refreshError } = await supabaseClient.auth.refreshSession();
            if (refreshError) {
              console.error('Erro ao renovar sessão:', refreshError.message);
              if (refreshError.message.includes('Invalid Refresh Token') || refreshError.message.includes('Refresh Token Not Found')) {
                 if (typeof window !== 'undefined') {
                   localStorage.removeItem('systemsat-auth-token');
                 }
                 await supabaseClient.auth.signOut().catch(() => {});
                 setUser(null);
              }
            }
          }
        }
      } catch (err: any) {
        console.error('Erro no heartbeat de sessão:', err.message);
      }
    }, 5 * 60 * 1000); // A cada 5 minutos

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) profileSubscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, [fetchDashboardLayouts]);

  const refreshData = useCallback(async () => {
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      console.warn('Supabase not configured, skipping refreshData');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Uploads
      try {
        const { data: uploadsData, error: uploadsError } = await supabaseClient
          .from('uploads')
          .select('*')
          .order('created_at', { ascending: false });

        if (uploadsError) throw uploadsError;
        setUploads(uploadsData || []);
      } catch (err) {
        logError('Error fetching uploads:', err);
      }

      // 2. Fetch Support Data (with pagination)
      let allSupportData: any[] = [];
      try {
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabaseClient
            .from('support_data')
            .select('*')
            .range(from, from + step - 1);

          if (error) throw error;

          if (!data || data.length === 0) {
            hasMore = false;
          } else {
            allSupportData = [...allSupportData, ...data];
            from += step;
            if (data.length < step) hasMore = false;
          }

          if (from > 50000) break; // Safety break
        }
      } catch (err) {
        logError('Error fetching support_data:', err);
      }

      // 3. Fetch Collaborator Settings
      try {
        const { data: settingsData, error: settingsError } = await supabaseClient
          .from('collaborator_settings')
          .select('*');

        if (settingsError) throw settingsError;

        const newAvatarMap = new Map(
          (settingsData || []).map((s: any) => [
            s.name,
            {
              url: s.avatar_url,
              options: s.avatar_options,
              badges: s.badges || [],
              goals: s.goals || []
            }
          ])
        );
        setAvatarMap(newAvatarMap);
      } catch (err) {
        logError('Error fetching collaborator_settings:', err);
      }

      // 4. Process and set raw rows even if some fetches failed
      const formattedData: SupportData[] = (allSupportData || []).map((d: any) => ({
        id: d.id,
        colaborador: d.colaborador,
        cliente: d.cliente,
        tempoResposta: d.tempo_resposta === null ? null : Number(d.tempo_resposta),
        duracao: d.duracao === null ? null : Number(d.duracao),
        avaliacao: Number(d.avaliacao || 0),
        atendimentos: Number(d.atendimentos || 1),
        mensagens: Number(d.mensagens || 0),
        data: new Date(d.data),
        source: d.source,
        stage: d.stage,
        slaDeadline: d.sla_deadline ? new Date(d.sla_deadline) : null,
        uploadId: d.upload_id,
        isExcluded: d.is_excluded,
        exclusionReason: d.exclusion_reason,
        rawData: d.raw_data,
        notes: d.notes,
        duracaoSegundos: d.duracao_segundos,
        tempoRespostaSegundos: d.tempo_resposta_segundos
      }));

      setRawRows(formattedData);
      
      // 4.5 Set Odoo Tickets from support_data
      const odooData = formattedData.filter(d => d.source === 'odoo');
      setOdooTickets(odooData);

      // 5. Fetch Bitrix Tickets
      try {
        const { data: bitrixData, error: bitrixError } = await supabaseClient
          .from('bitrix_tickets')
          .select('*')
          .order('created_at', { ascending: false });

        if (bitrixError) throw bitrixError;
        setBitrixTickets(bitrixData || []);
      } catch (err: any) {
        if (err?.code !== '42P01') {
          logError('Error fetching bitrix_tickets:', err);
        }
      }

    } catch (err) {
      logError('General error in refreshData:', err);
      setError('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }

  }, [isSupabaseConfigured]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

    const { collaborators: calculatedCollaborators, dashboard: calculatedDashboard, selectedRows: calculatedSelectedRows, periodDashboard: calculatedPeriodDashboard, totalDashboard: calculatedTotalDashboard } =
    React.useMemo(() => {

      if (rawRows.length === 0)
        return { collaborators: [], dashboard: null, selectedRows: [], periodDashboard: null, totalDashboard: null };

      // Base filtering for Chat Dashboard
      let filteredData = rawRows.filter(row => row.source === 'chat' || !row.source);
      
      // Data for Total Dashboard
      let totalFilteredData = rawRows.filter(row => row.source === 'chat' || !row.source);
      
      // Apply Date Filter
      if (dateFilter !== 'all') {
        filteredData = filteredData.filter(row => {
          const rowDate = new Date(row.data);
          // Use local components to match what the user sees in the UI
          const localDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
          return isWithinInterval(localDate, { start: dateRange.start, end: dateRange.end });
        });
        totalFilteredData = totalFilteredData.filter(row => {
          const rowDate = new Date(row.data);
          const localDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
          return isWithinInterval(localDate, { start: dateRange.start, end: dateRange.end });
        });
      }

      // Apply global search and status filters to both datasets for consistency
      const applyGlobalFilters = (data: SupportData[]) => {
        return data.filter(row => {
          const matchesSearch = searchTerm === '' || 
            Object.entries(row).some(([key, val]) => {
              if (key === 'rawData' && val) {
                return Object.values(val).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
              }
              return !['data', 'uploadId', 'isExcluded', 'exclusionReason', 'rawData'].includes(key) && 
                     String(val).toLowerCase().includes(searchTerm.toLowerCase());
            });
          
          if (filterStatus === 'included') return !row.isExcluded && matchesSearch;
          if (filterStatus === 'excluded') return row.isExcluded && matchesSearch;
          return matchesSearch;
        });
      };

      const finalFilteredData = applyGlobalFilters(filteredData);
      const finalTotalFilteredData = applyGlobalFilters(totalFilteredData);

      if (finalFilteredData.length === 0 && finalTotalFilteredData.length === 0)
        return { collaborators: [], dashboard: null, selectedRows: filteredData, periodDashboard: null, totalDashboard: null };

      // Dashboard for Chat Dashboard (respects dateFilter AND global filters)
      const { collaborators: collabs, dashboard: dash } = calculateStats(finalFilteredData, pointsConfig);

      // Calculate period-aware dashboard for General Dashboard
      const { dashboard: periodDash } = calculateStats(finalFilteredData, pointsConfig);
      
      // Calculate total dashboard for General Dashboard (respects dateFilter AND global filters)
      const { dashboard: totalDash } = calculateStats(finalTotalFilteredData, pointsConfig);

      const collabsWithAvatars = collabs.map(c => {
        const settings = avatarMap.get(c.name);
        return {
          ...c,
          avatarUrl: settings?.url,
          avatarOptions: settings?.options,
          badges: settings?.badges || [],
          goals: settings?.goals || []
        };
      });

      return {
        collaborators: collabsWithAvatars,
        dashboard: dash,
        periodDashboard: periodDash,
        totalDashboard: totalDash,
        selectedRows: finalFilteredData // Use filtered data that respects search and status filters
      };

    }, [rawRows, avatarMap, searchTerm, filterStatus, dateFilter, dateRange, pointsConfig, columnFilters]);

  useEffect(() => {
    setCollaborators(calculatedCollaborators);
    setDashboard(calculatedDashboard);
    setPeriodDashboard(calculatedPeriodDashboard);
    setTotalDashboard(calculatedTotalDashboard);
    setSelectedRows(calculatedSelectedRows);
  }, [calculatedCollaborators, calculatedDashboard, calculatedPeriodDashboard, calculatedTotalDashboard, calculatedSelectedRows]);

  const setOdooTicketsData = useCallback(async (tickets: any[], filename: string) => {
    setIsLoading(true);
    setError(null);

    if (isSupabaseConfigured && supabase) {
      const supabaseClient = supabase;

      try {
        // 1. Create upload record
        const uploadPayload: any = { filename, row_count: tickets.length, source: 'odoo' };
        let { data: upload, error: uploadError } = await supabaseClient
          .from('uploads')
          .insert([uploadPayload])
          .select()
          .single();

        // Fallback for PGRST204 (schema cache issue)
        if (uploadError?.code === 'PGRST204') {
          console.warn('PGRST204 detected on uploads insert, retrying without source column...');
          const { source, ...fallbackPayload } = uploadPayload;
          const { data: retryUpload, error: retryError } = await supabaseClient
            .from('uploads')
            .insert([fallbackPayload])
            .select()
            .single();
          
          upload = retryUpload;
          uploadError = retryError;
        }

        if (uploadError) throw uploadError;

        // 2. Map Odoo tickets to support_data schema
        const supportDataFromOdoo = tickets.map(t => {
          // Ensure we have a valid UUID for the 'id' column if it's not a UUID
          let finalId = t.id;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          
          if (!finalId || !uuidRegex.test(finalId)) {
            if (finalId) {
              // Deterministic UUID for Odoo IDs
              let hash1 = 5381;
              let hash2 = 0;
              const idStr = String(finalId);
              for (let j = 0; j < idStr.length; j++) {
                hash1 = (hash1 * 33) ^ idStr.charCodeAt(j);
                hash2 = ((hash2 << 5) - hash2) + idStr.charCodeAt(j);
                hash2 = hash2 & hash2;
              }
              const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
              const h2 = (Math.abs(hash2) >>> 0).toString(16).padStart(8, '0');
              finalId = `eeeeeeee-eeee-4000-8000-${h1}${h2}`.slice(0, 36);
            } else {
              finalId = crypto.randomUUID();
            }
          }

          return {
            id: finalId,
            upload_id: upload.id,
            colaborador: t.assignee || 'Sem Atendente',
            cliente: t.client || 'Sem Cliente',
            data: t.created_at || new Date().toISOString(),
            stage: t.stage || null,
            sla_deadline: t.sla_deadline || null,
            source: 'odoo',
            source_file: filename,
            imported_at: new Date().toISOString(),
            raw_data: {
              id: t.id, // Store original Odoo ID
              name: t.name, // Store original Odoo Name
              priority: t.priority,
              subject: t.subject,
              team: t.team,
              last_updated: t.last_updated,
              link: t.link,
              properties: t.properties
            },
            // Default values for fields not present in Odoo
            tempo_resposta: null,
            duracao: null,
            avaliacao: 0,
            atendimentos: 1,
            mensagens: 0,
            is_excluded: false
          };
        });

        // 3. Upsert to support_data (unified table)
        // Use ignoreDuplicates: true to keep the first item if ID repeats
        const { error: upsertError } = await supabaseClient
          .from('support_data')
          .upsert(supportDataFromOdoo, { onConflict: 'id', ignoreDuplicates: true });

        if (upsertError) {
          // Fallback for PGRST204 (schema cache issue)
          if (upsertError.code === 'PGRST204') {
            console.warn('PGRST204 detected on support_data upsert from Odoo, retrying without new columns...');
            const fallbackTickets = supportDataFromOdoo.map(({ source_file, imported_at, ...rest }: any) => rest);
            const { error: retryError } = await supabaseClient
              .from('support_data')
              .upsert(fallbackTickets, { onConflict: 'id', ignoreDuplicates: true });
            
            if (retryError) {
              logError('Retry Odoo to Support Upsert error:', retryError);
              throw retryError;
            }
          } else {
            throw upsertError;
          }
        }

        await refreshData();
      } catch (err: any) {
        logError('Error saving Odoo data:', err);
        setError(`Erro ao salvar Odoo: ${err.message}`);
      }
    }
    setIsLoading(false);
  }, [refreshData, isSupabaseConfigured]);

  const setRawData = useCallback(async (
    processedData: SupportData[],
    allRows: SupportData[],
    filename: string = 'Upload Manual',
    rawData: RawSpreadsheetRow[] = [],
    source: 'chat' | 'odoo' | 'bitrix' = 'chat',
    indicators?: any,
    logs?: any[]
  ) => {

    setIsLoading(true);
    setError(null);
    setRawSpreadsheetData(rawData);
    if (indicators) setImportIndicators(indicators);
    if (logs) setImportLogs(logs);

    if (isSupabaseConfigured && supabase) {
      const supabaseClient = supabase;

      try {

        const uploadPayload: any = { filename, row_count: processedData.length, source };
        let { data: upload, error: uploadError } = await supabaseClient
          .from('uploads')
          .insert([uploadPayload])
          .select()
          .single();

        // Fallback for PGRST204 (schema cache issue)
        if (uploadError?.code === 'PGRST204') {
          console.warn('PGRST204 detected on uploads insert in setRawData, retrying without source column...');
          const { source: _, ...fallbackPayload } = uploadPayload;
          const { data: retryUpload, error: retryError } = await supabaseClient
            .from('uploads')
            .insert([fallbackPayload])
            .select()
            .single();
          
          upload = retryUpload;
          uploadError = retryError;
        }

        if (uploadError) throw uploadError;

        const chunkSize = 500;

        for (let i = 0; i < allRows.length; i += chunkSize) {

          const chunk = allRows.slice(i, i + chunkSize).map(d => {
            // Ensure we have a valid UUID for the 'id' column
            let finalId = d.id;
            
            // If the ID is missing or not a valid UUID, we need to handle it
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!finalId || !uuidRegex.test(finalId)) {
              if (finalId) {
                // If we have a non-UUID ID, generate a deterministic UUID based on it
                // to maintain deduplication (same ID from spreadsheet = same UUID)
                let hash1 = 5381;
                let hash2 = 0;
                for (let j = 0; j < finalId.length; j++) {
                  hash1 = (hash1 * 33) ^ finalId.charCodeAt(j);
                  hash2 = ((hash2 << 5) - hash2) + finalId.charCodeAt(j);
                  hash2 = hash2 & hash2;
                }
                const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
                const h2 = (Math.abs(hash2) >>> 0).toString(16).padStart(8, '0');
                finalId = `00000000-0000-4000-8000-${h1}${h2}`.slice(0, 36);
              } else {
                // If no ID at all, generate a deterministic UUID based on row content
                // to prevent duplicates of the exact same row (Collab + Client + Date)
                const fingerprint = `${d.colaborador}|${d.cliente}|${d.data.getTime()}|${d.mensagens}`;
                let hash1 = 5381;
                let hash2 = 0;
                for (let j = 0; j < fingerprint.length; j++) {
                  hash1 = (hash1 * 33) ^ fingerprint.charCodeAt(j);
                  hash2 = ((hash2 << 5) - hash2) + fingerprint.charCodeAt(j);
                  hash2 = hash2 & hash2;
                }
                const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
                const h2 = (Math.abs(hash2) >>> 0).toString(16).padStart(8, '0');
                finalId = `ffffffff-ffff-4000-8000-${h1}${h2}`.slice(0, 36);
              }
            }

            return {
              id: finalId,
              upload_id: upload.id,
              colaborador: d.colaborador,
              cliente: d.cliente,
              tempo_resposta: d.tempoResposta,
              duracao: d.duracao,
              avaliacao: d.avaliacao || 0,
              atendimentos: d.atendimentos || 1,
              mensagens: d.mensagens || 0,
              data: d.data.toISOString(),
              source: source,
              stage: d.stage || null,
              sla_deadline: d.slaDeadline ? d.slaDeadline.toISOString() : null,
              is_excluded: d.isExcluded || false,
              exclusion_reason: d.exclusionReason || null,
              raw_data: d.rawData || null,
              source_file: filename,
              imported_at: new Date().toISOString(),
              // New fields from ChatGPT prompt
              criado_em: d.criadoEm ? d.criadoEm.toISOString() : null,
              agente_respondeu_em: d.agenteRespondeuEm ? d.agenteRespondeuEm.toISOString() : null,
              agente_encerrou_em: d.agenteEncerrouEm ? d.agenteEncerrouEm.toISOString() : null,
              duracao_conversa_segundos: d.duracaoSegundos || null,
              tempo_inicial_resposta_segundos: d.tempoRespostaSegundos || null,
              avaliado_pelos_clientes: d.avaliadoPelosClientes || null
            };
          });

          const { error: dataError } = await supabaseClient
            .from('support_data')
            .upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });

          if (dataError) {
            // Fallback for PGRST204 (schema cache issue)
            if (dataError.code === 'PGRST204') {
              console.warn('PGRST204 detected on support_data upsert, retrying without new columns...');
              const fallbackChunk = chunk.map(({ 
                criado_em, agente_respondeu_em, agente_encerrou_em, 
                duracao_conversa_segundos, tempo_inicial_resposta_segundos, 
                avaliado_pelos_clientes, source, stage, sla_deadline, 
                source_file, imported_at, is_excluded, exclusion_reason, ...rest 
              }: any) => rest);
              const { error: retryError } = await supabaseClient
                .from('support_data')
                .upsert(fallbackChunk, { onConflict: 'id', ignoreDuplicates: true });
              if (retryError) throw retryError;
            } else if (dataError.code === '23502') {
              // Fallback for 23502 (NOT NULL constraint violation)
              console.warn('23502 detected on support_data insert (NOT NULL violation), retrying with default values for null fields...');
              const fallbackChunk = chunk.map(d => ({
                ...d,
                tempo_resposta: d.tempo_resposta === null ? 0 : d.tempo_resposta,
                duracao: d.duracao === null ? 0 : d.duracao,
                avaliacao: d.avaliacao === null ? 0 : d.avaliacao
              }));
              const { error: retryError } = await supabaseClient
                .from('support_data')
                .upsert(fallbackChunk, { onConflict: 'id', ignoreDuplicates: true });
              if (retryError) throw retryError;
            } else {
              throw dataError;
            }
          }

          // Also save to raw_chat_data and processed_chat_data if source is chat
          if (source === 'chat') {
            const rawChunk = chunk.map(d => ({
              id: d.id,
              cliente: d.cliente,
              mensagens: d.mensagens,
              colaborador: d.colaborador,
              criado_em: d.criado_em,
              agente_respondeu_em: d.agente_respondeu_em,
              agente_encerrou_em: d.agente_encerrou_em,
              duracao_conversa: d.raw_data?.['Duração da conversa'] || null,
              tempo_inicial_resposta: d.raw_data?.['Tempo inicial de resposta'] || null,
              avaliado_pelos_clientes: d.avaliado_pelos_clientes,
              upload_id: d.upload_id,
              imported_at: d.imported_at
            }));

            const processedChunk = chunk.filter(d => !d.is_excluded).map(d => ({
              id: d.id,
              cliente: d.cliente,
              mensagens: d.mensagens,
              colaborador: d.colaborador,
              criado_em: d.criado_em,
              agente_respondeu_em: d.agente_respondeu_em,
              agente_encerrou_em: d.agente_encerrou_em,
              duracao_minutos: d.duracao,
              tempo_resposta_minutos: d.tempo_resposta,
              avaliacao: d.avaliacao,
              upload_id: d.upload_id,
              imported_at: d.imported_at
            }));

            if (rawChunk.length > 0) {
              await supabaseClient.from('raw_chat_data').upsert(rawChunk, { onConflict: 'id', ignoreDuplicates: true });
            }
            if (processedChunk.length > 0) {
              await supabaseClient.from('processed_chat_data').upsert(processedChunk, { onConflict: 'id', ignoreDuplicates: true });
            }
          }
        }

        await refreshData();

      } catch (err: any) {

        logError('Error saving data to Supabase:', err);

        const message =
          err?.message ||
          err?.details ||
          err?.hint ||
          JSON.stringify(err);

        setError(`Erro ao salvar no banco: ${message}`);

        const localId = Math.random().toString(36).substring(7);

        setUploads(prev => [
          { id: localId, filename, created_at: new Date().toISOString(), row_count: allRows.length },
          ...prev
        ]);

        setRawRows(allRows);

        const { collaborators, dashboard } = calculateStats(processedData, pointsConfig);

        setCollaborators(collaborators);
        setDashboard(dashboard);
      }

    } else {

      const localId = Math.random().toString(36).substring(7);

      setUploads(prev => [
        { id: localId, filename, created_at: new Date().toISOString(), row_count: allRows.length },
        ...prev
      ]);

      setRawRows(allRows);

      const { collaborators, dashboard } = calculateStats(processedData, pointsConfig);

      setCollaborators(collaborators);
      setDashboard(dashboard);
    }

    setIsLoading(false);
  }, [refreshData, isSupabaseConfigured, pointsConfig]);

  const syncOdooTickets = useCallback(async (apiKey?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (apiKey) {
        headers['X-Odoo-API-Key'] = apiKey;
      }
      
      const response = await fetch('/api/odoo/tickets', { headers });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao sincronizar com o Odoo');
      }
      const tickets = await response.json();
      await setOdooTicketsData(tickets, 'Sincronização Automática Odoo');
      await refreshData();
      return tickets;
    } catch (err: any) {
      console.error('Erro na sincronização Odoo:', err);
      setError(err.message || 'Erro ao sincronizar com o Odoo');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setOdooTicketsData, refreshData]);

  const syncBitrixTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/tickets', { method: 'POST' });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao sincronizar com o Bitrix');
      }
      await refreshData();
    } catch (err: any) {
      console.error('Erro na sincronização Bitrix:', err);
      setError(err.message || 'Erro ao sincronizar com o Bitrix');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  const deleteUpload = async (id: string) => {
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      setUploads(prev => prev.filter(u => u.id !== id));
      setRawRows([]);
      setCollaborators([]);
      setDashboard(null);
      return;
    }

    setIsLoading(true);

    try {

      const { error: dataError } = await supabaseClient
        .from('support_data')
        .delete()
        .eq('upload_id', id);

      if (dataError) throw dataError;

      const { error: uploadError } = await supabaseClient
        .from('uploads')
        .delete()
        .eq('id', id);

      if (uploadError) throw uploadError;

      await refreshData();

    } catch (err: any) {
      logError('Error deleting upload:', err);
      setError(`Erro ao excluir upload: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCollaborator = async (name: string) => {
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      const filtered = rawRows.filter(r => r.colaborador !== name);
      setRawRows(filtered);
      const { collaborators, dashboard } = calculateStats(filtered, pointsConfig);
      setCollaborators(collaborators);
      setDashboard(dashboard);
      return;
    }

    setIsLoading(true);

    try {

      const { error: dataError } = await supabaseClient
        .from('support_data')
        .delete()
        .eq('colaborador', name);

      if (dataError) throw dataError;

      await supabaseClient
        .from('collaborator_settings')
        .delete()
        .eq('name', name);

      await refreshData();

    } catch (err: any) {
      logError('Error deleting collaborator:', err);
      setError(`Erro ao excluir colaborador: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCollaboratorAvatar = async (name: string, avatarUrl: string, options?: any) => {
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      setCollaborators(prev =>
        prev.map(c => (c.name === name ? { ...c, avatarUrl, avatarOptions: options } : c))
      );
      return;
    }

    try {

      const { error } = await supabaseClient
        .from('collaborator_settings')
        .upsert({
          name,
          avatar_url: avatarUrl,
          avatar_options: options
        });

      if (error) throw error;

      setCollaborators(prev =>
        prev.map(c => (c.name === name ? { ...c, avatarUrl, avatarOptions: options } : c))
      );

    } catch (err: any) {
      logError('Error updating avatar:', err);
      setError(`Erro ao atualizar avatar: ${err?.message}`);
    }
  };

  const updateCollaboratorBadges = async (name: string, badges: string[]) => {
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      setCollaborators(prev =>
        prev.map(c => (c.name === name ? { ...c, badges } : c))
      );
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('collaborator_settings')
        .upsert({
          name,
          badges
        });

      if (error) throw error;

      setCollaborators(prev =>
        prev.map(c => (c.name === name ? { ...c, badges } : c))
      );
    } catch (err: any) {
      logError('Error updating badges:', err);
    }
  };

  const updateCollaboratorGoals = async (name: string, goals: any[]) => {
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      setCollaborators(prev =>
        prev.map(c => (c.name === name ? { ...c, goals } : c))
      );
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('collaborator_settings')
        .upsert({
          name,
          goals
        });

      if (error) throw error;

      setCollaborators(prev =>
        prev.map(c => (c.name === name ? { ...c, goals } : c))
      );
    } catch (err: any) {
      logError('Error updating goals:', err);
    }
  };

  const updateDashboardLayout = async (layout: any[]) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) {
      setDashboardLayout(layout);
      return;
    }

    try {
      // 1. Update the profile (last used layout)
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ dashboard_layout: layout })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile layout:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details
        });
      }
      
      // 2. If a named layout is selected, update it too
      if (selectedLayoutId) {
        const { error: namedError } = await supabaseClient
          .from('dashboard_layouts')
          .update({ 
            layout,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedLayoutId)
          .eq('user_id', user.id);
        
        if (namedError) {
          console.error('Error updating named layout:', {
            code: namedError.code,
            message: namedError.message,
            details: namedError.details
          });
        }
        
        // Update local state for layouts list
        setDashboardLayouts(prev => prev.map(l => 
          l.id === selectedLayoutId ? { ...l, layout, updated_at: new Date().toISOString() } : l
        ));
      }
      
      setDashboardLayout(layout);
    } catch (err: any) {
      console.error('Error updating dashboard layout:', err);
      // Don't show error to user for background updates to avoid noise, 
      // but log it for debugging
    }
  };

  const updateQueueLayout = async (layout: any[]) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;

    try {
      setQueueLayout(layout);
      
      // Update profile
      await supabaseClient
        .from('profiles')
        .update({ queue_layout: layout })
        .eq('id', user.id);
    } catch (err: any) {
      console.error('Error updating queue layout:', err);
    }
  };

  const updateSettingsLayout = async (layout: any[]) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) {
      setSettingsLayout(layout);
      return;
    }

    try {
      setSettingsLayout(layout);
      await supabaseClient
        .from('profiles')
        .update({ settings_layout: layout })
        .eq('id', user.id);
    } catch (err: any) {
      console.error('Error updating settings layout:', err);
    }
  };

  const saveDashboardLayout = async (name: string, layout: any[], isDefault: boolean = false) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) {
      console.warn('Save attempted without user or supabase client');
      return;
    }

    try {
      console.log('Saving layout:', { name, userId: user.id });

      // If setting as default, unset others
      if (isDefault) {
        await supabaseClient
          .from('dashboard_layouts')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabaseClient
        .from('dashboard_layouts')
        .upsert({
          user_id: user.id,
          name,
          layout,
          is_default: isDefault,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,name' })
        .select()
        .single();

      if (error) {
        console.error('Supabase error in saveDashboardLayout:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Nenhum dado retornado após o salvamento.');
      }
      
      await fetchDashboardLayouts(user.id);
      setSelectedLayoutId(data.id);
      setDashboardLayout(layout);
      
      console.log('Layout saved successfully:', data.id);
    } catch (err: any) {
      // Extremely verbose logging for debugging
      const errorDetails = {
        message: err.message || 'No message',
        code: err.code || 'No code',
        details: err.details || 'No details',
        hint: err.hint || 'No hint',
        status: err.status || 'No status'
      };
      
      console.error('Detailed error saving dashboard layout (Stringified):', JSON.stringify(errorDetails, null, 2));
      console.error('Full error object:', err);
      
      let userMessage = err.message || 'Erro desconhecido';
      
      if (err.code === '42P01') {
        userMessage = 'A tabela "dashboard_layouts" não foi encontrada. Por favor, execute a query SQL fornecida no chat para criar as tabelas necessárias.';
      } else if (err.code === '42703') {
        userMessage = 'Uma coluna necessária está faltando no banco de dados. Por favor, execute a query SQL de atualização.';
      } else if (err.code === '23505') {
        userMessage = 'Já existe um layout com este nome.';
      } else if (err.code === 'PGRST116') {
        userMessage = 'Erro ao processar o retorno do banco (Single row expected). Verifique se o layout foi salvo corretamente.';
      }
      
      setError(`Erro ao salvar layout: ${userMessage}`);
    }
  };

  const deleteDashboardLayout = async (id: string) => {
    const supabaseClient = supabase;
    if (!supabaseClient || !user) return;

    try {
      const { error } = await supabaseClient
        .from('dashboard_layouts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      if (selectedLayoutId === id) {
        setSelectedLayoutId(null);
      }
      
      await fetchDashboardLayouts(user.id);
    } catch (err: any) {
      console.error('Error deleting dashboard layout:', err);
      setError(`Erro ao excluir layout: ${err.message}`);
    }
  };

  const selectDashboardLayout = async (id: string) => {
    if (!id) {
      setSelectedLayoutId(null);
      return;
    }
    
    const layout = dashboardLayouts.find(l => l.id === id);
    if (layout) {
      setSelectedLayoutId(id);
      setDashboardLayout(layout.layout);
      
      // Also update profile as last used
      if (user && supabase) {
        await supabase
          .from('profiles')
          .update({ dashboard_layout: layout.layout })
          .eq('id', user.id);
      }
    }
  };

  const toggleRowExclusion = async (rowId: string, exclude: boolean, reason?: string) => {
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      setRawRows(prev => prev.map(r => r.id === rowId ? { ...r, isExcluded: exclude, exclusionReason: reason } : r));
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('support_data')
        .update({ is_excluded: exclude, exclusion_reason: reason })
        .eq('id', rowId);

      if (error) throw error;
      await refreshData();
    } catch (err: any) {
      logError('Error toggling row exclusion:', err);
      setError(`Erro ao ${exclude ? 'excluir' : 'restaurar'} item: ${err?.message}`);
    }
  };

  const updateRowNote = async (rowId: string, note: string) => {
    const supabaseClient = supabase;

    if (!isSupabaseConfigured || !supabaseClient) {
      setRawRows(prev => prev.map(r => r.id === rowId ? { ...r, notes: note } : r));
      return;
    }

    try {
      const { error } = await supabaseClient
        .from('support_data')
        .update({ notes: note })
        .eq('id', rowId);

      if (error) throw error;
      await refreshData();
    } catch (err: any) {
      logError('Error updating row note:', err);
      setError(`Erro ao salvar nota: ${err?.message}`);
    }
  };

  const clearError = () => setError(null);

  const resetData = () => {
    setRawRows([]);
    setCollaborators([]);
    setDashboard(null);
  };

  const clearAllData = async () => {
    if (!isSupabaseConfigured || !supabase) {
      resetData();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Delete all support data
      const { error: dataError } = await supabase
        .from('support_data')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (dataError) throw dataError;

      // 2. Delete all uploads
      const { error: uploadError } = await supabase
        .from('uploads')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (uploadError) throw uploadError;

      // 3. Clear local state and refresh
      resetData();
      await refreshData();
    } catch (err: any) {
      console.error('Error clearing all data:', err);
      setError('Erro ao limpar dados do banco de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      const interval = setInterval(() => {
        fetch('/api/bitrix/timeman/check-schedules')
          .then(res => res.json())
          .then(data => {
            if (data.actionsTaken && data.actionsTaken.length > 0) {
              console.log('Bitrix Auto-Actions:', data.actionsTaken);
            }
          })
          .catch(err => console.error('Error checking bitrix schedules:', err));
      }, 60000); // Every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        rawRows,
        rawSpreadsheetData,
        collaborators,
        dashboard,
        periodDashboard,
        totalDashboard,
        isLoading,
        uploads,
        selectedRows,
        searchTerm,
        setSearchTerm,
        filterStatus,
        setFilterStatus,
        dateFilter,
        setDateFilter,
        customRange,
        setCustomRange,
        columnFilters,
        setColumnFilter,
        clearColumnFilters,
        dateRange,
        error,
        bitrixTickets,
        odooTickets,
        setRawData,
        setOdooTicketsData,
        syncOdooTickets,
        syncBitrixTickets,
        resetData,
        clearAllData,
        deleteUpload,
        deleteCollaborator,
        toggleRowExclusion,
        updateRowNote,
        updateCollaboratorAvatar,
        updateCollaboratorBadges,
        updateCollaboratorGoals,
        refreshData,
        clearError,
        importLogs,
        importIndicators,
        user,
        userRole,
        userPermissions,
        isAuthReady,
        supabase,
        dashboardLayout,
        queueLayout,
        dashboardLayouts,
        selectedLayoutId,
        updateDashboardLayout,
        updateQueueLayout,
        updateSettingsLayout,
        saveDashboardLayout,
        deleteDashboardLayout,
        selectDashboardLayout,
        bitrixUsers,
        bitrixSchedules,
        loadingBitrix,
        fetchBitrixTimeman,
        fetchBitrixSchedules,
        handleTimemanAction,
        lastKnownDurations,
        settingsLayout,
        pointsConfig,
        updatePointsConfig
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {

  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
}