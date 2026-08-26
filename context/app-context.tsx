'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { SupportData, CollaboratorStats, DashboardStats, calculateStats, RawSpreadsheetRow, RankingPointsConfig, isRowExcluded } from '@/lib/data-utils';
import { apiGet, apiSend, invalidateApiCache } from '@/lib/api-client';
import {
  startOfDay,
  endOfDay,
  subDays,
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
  reorder_queue: boolean;
  edit_raw_data: boolean;
}

interface AppState {
  rawRows: SupportData[];
  collaborators: CollaboratorStats[];
  dashboard: DashboardStats | null;
  totalDashboard: DashboardStats | null;
  selectedRows: SupportData[];
  selectedOdooRows: SupportData[];
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
  updateRowFields: (rowId: string, fields: { colaborador?: string; tempoRespostaSegundos?: number | null; avaliacao?: number }) => Promise<void>;
  updateCollaboratorAvatar: (name: string, avatarUrl: string, options?: any) => Promise<void>;
  updateCollaboratorBadges: (name: string, badges: string[]) => Promise<void>;
  updateCollaboratorGoals: (name: string, goals: any[]) => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
  user: any | null;
  userRole: string | null;
  userPermissions: UserPermissions | null;
  isAuthReady: boolean;
  refreshSession: () => Promise<void>;
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

/**
 * Só troca o estado quando o conteúdo realmente mudou.
 *
 * O heartbeat de sessão roda a cada 5 minutos e reescrevia `user`, `permissions`
 * e os layouts com objetos novos mesmo sem nenhuma alteração. Vários efeitos
 * dependem dessas referências (o `refreshData` deste contexto e o carregamento
 * da fila em queue-context), então a aplicação inteira se recarregava sozinha em
 * ciclos de 5 minutos — era isso que fazia a tela "piscar".
 */
function setIfChanged<T>(setter: React.Dispatch<React.SetStateAction<T>>, next: T) {
  setter(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
}

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
  edit_collaborators: false,
  reorder_queue: false,
  edit_raw_data: false
};

function getDateRange(filter: string, custom: { start: string; end: string }) {
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
}

export function AppProvider({ children }: { children: ReactNode }) {

  // `collaborators`, `dashboard`, `totalDashboard`, `selectedRows` e
  // `selectedOdooRows` não são estado: são derivados de `rawRows` no memo mais
  // abaixo. Mantê-los em useState só duplicava cada atualização.
  const [rawRows, setRawRows] = useState<SupportData[]>([]);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
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

  const updatePointsConfig = useCallback((newConfig: RankingPointsConfig) => {
    setPointsConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ranking_points_config', JSON.stringify(newConfig));
    }
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'included' | 'excluded'>('included');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const [importIndicators, setImportIndicators] = useState<{ totalImported: number; totalIgnored: number; totalProcessed: number; totalDuplicates: number } | null>(null);

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

const setColumnFilter = useCallback((key: string, value: any) => {
  setColumnFilters(prev => ({ ...prev, [key]: value }));
}, []);

const clearColumnFilters = useCallback(() => {
  setColumnFilters({
    collaborators: [],
    clients: [],
    rating: null,
    messagesMin: null
  });
}, []);



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
  const checkSessionRef = React.useRef<(() => Promise<void>) | undefined>(undefined);
  const sessionUserIdRef = React.useRef<string | null>(null);

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

  const parseNumber = (v: any) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  };

  const logError = (label: string, err: any) => {
    console.error(label, err);
  };

  const fetchDashboardLayouts = useCallback(async () => {
    try {
      const { data } = await apiGet<{ data: any[] }>('/api/app-data/dashboard-layouts');
      setIfChanged<any[]>(setDashboardLayouts, data || []);

      // If no layout is selected, use the default one or the first one
      const defaultLayout = data?.find(l => l.is_default) || data?.[0];
      if (defaultLayout) {
        // Functional update avoids depending on `dashboardLayout` (which would
        // change this callback's identity and re-trigger the session effect
        // below in an infinite loop, since it fires on every profile fetch).
        setDashboardLayout(prev => prev ?? defaultLayout.layout);
      }
    } catch (err) {
      console.error('Error fetching dashboard layouts:', err);
    }
  }, []);

  // Auth and Profile Handling. Session lives in an httpOnly cookie set by
  // /api/auth/login; polling /api/auth/session every 5 minutes both keeps the
  // token fresh (server-side sliding refresh) and re-syncs role/permissions,
  // replacing the previous Supabase onAuthStateChange + Realtime subscription.
  useEffect(() => {
    const fetchProfile = async (userId: string, email?: string) => {
      try {
        // Fetch layouts first
        await fetchDashboardLayouts();
        // Se for o admin principal, sempre dar todas as permissões
        if (email?.toLowerCase() === 'admin@systemsat.com.br') {
          setUserRole('admin');
          setIfChanged<UserPermissions | null>(setUserPermissions, {
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
            edit_collaborators: true,
            reorder_queue: true,
            edit_raw_data: true
          });
          return;
        }

        const { profile } = await apiGet<{ profile: any | null }>('/api/profile/me');

        if (!profile) {
          setUserRole('user');
          setIfChanged<UserPermissions | null>(setUserPermissions, {
            ...basePermissions,
            view_general: true // Apenas tela geral por padrão para novos usuários
          });
          setDashboardLayout(null);
          setQueueLayout(null);
        } else {
          setUserRole(profile.role || 'user');
          setIfChanged<any[] | null>(setDashboardLayout, profile.dashboard_layout || null);
          setIfChanged<any[] | null>(setQueueLayout, profile.queue_layout || null);
          setIfChanged<any[] | null>(setSettingsLayout, profile.settings_layout || null);

          // Garantir que permissões sejam um objeto válido
          const dbPermissions = typeof profile.permissions === 'object' && profile.permissions !== null
            ? profile.permissions
            : {};

          setIfChanged<UserPermissions | null>(setUserPermissions, {
            ...basePermissions,
            ...dbPermissions
          });
        }
      } catch (err: any) {
        console.error('Erro ao buscar perfil:', err);
        setUserRole('user');
        setIfChanged<UserPermissions | null>(setUserPermissions, basePermissions);
      }
    };

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          // Sessão encerrada: nada do usuário anterior pode sobreviver no cache.
          invalidateApiCache();
          sessionUserIdRef.current = null;
          setUser(null);
          setUserRole(null);
          setUserPermissions(null);
          return;
        }
        const { user: sessionUser } = await res.json();

        // Troca de usuário na mesma aba também precisa descartar o cache.
        const novoId = sessionUser?.id ?? null;
        if (sessionUserIdRef.current !== novoId) {
          invalidateApiCache();
          sessionUserIdRef.current = novoId;
        }

        setIfChanged<any | null>(setUser, sessionUser);
        if (sessionUser) {
          await fetchProfile(sessionUser.id, sessionUser.email);
        }
      } catch (err: any) {
        console.error('Erro inesperado na configuração da sessão:', err);
      } finally {
        setIsAuthReady(true);
      }
    };

    checkSession();
    checkSessionRef.current = checkSession;

    // Heartbeat: re-checks the session every 5 minutes. The server transparently
    // reissues the cookie when it's within 10 minutes of expiring, and this also
    // re-syncs role/permissions in place of the old Realtime subscription.
    const sessionCheckInterval = setInterval(checkSession, 5 * 60 * 1000);

    return () => {
      clearInterval(sessionCheckInterval);
    };
  }, [fetchDashboardLayouts]);

  const refreshSession = useCallback(async () => {
    if (checkSessionRef.current) await checkSessionRef.current();
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // These four reads are independent of each other, so fetch them
      // concurrently instead of one-after-another - refreshData runs after
      // nearly every mutation (upload, sync, note edit, exclusion toggle),
      // so serializing them here meant every single action in the app paid
      // the sum of all four round trips instead of just the slowest one.
      const [uploadsResult, supportDataResult, settingsResult, bitrixResult] = await Promise.allSettled([
        apiGet<{ data: any[] }>('/api/app-data/uploads'),
        apiGet<{ data: any[] }>('/api/app-data/support-data'),
        apiGet<{ data: any[] }>('/api/app-data/collaborator-settings'),
        apiGet<{ data: any[] }>('/api/app-data/bitrix-tickets'),
      ]);

      // 1. Uploads
      if (uploadsResult.status === 'fulfilled') {
        setUploads(uploadsResult.value.data || []);
      } else {
        logError('Error fetching uploads:', uploadsResult.reason);
      }

      // 2. Support Data
      let allSupportData: any[] = [];
      if (supportDataResult.status === 'fulfilled') {
        allSupportData = supportDataResult.value.data || [];
      } else {
        logError('Error fetching support_data:', supportDataResult.reason);
      }

      // 3. Collaborator Settings
      if (settingsResult.status === 'fulfilled') {
        const settingsData = settingsResult.value.data || [];
        const newAvatarMap = new Map(
          settingsData.map((s: any) => [
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
      } else {
        logError('Error fetching collaborator_settings:', settingsResult.reason);
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
        isExcluded: (d.is_excluded !== undefined && d.is_excluded !== null) ? d.is_excluded : isRowExcluded({ mensagens: Number(d.mensagens || 0), colaborador: d.colaborador, data: new Date(d.data) }).isExcluded,
        exclusionReason: d.exclusion_reason || (d.is_excluded === undefined || d.is_excluded === null ? isRowExcluded({ mensagens: Number(d.mensagens || 0), colaborador: d.colaborador, data: new Date(d.data) }).reason : undefined),
        rawData: d.raw_data,
        notes: d.notes,
        duracaoSegundos: d.duracao_segundos,
        tempoRespostaSegundos: d.tempo_resposta_segundos
      }));

      setRawRows(formattedData);

      // 4.5 Set Odoo Tickets from support_data
      const odooData = formattedData.filter(d => d.source === 'odoo');
      setOdooTickets(odooData);

      // 5. Bitrix Tickets
      if (bitrixResult.status === 'fulfilled') {
        setBitrixTickets(bitrixResult.value.data || []);
      } else {
        logError('Error fetching bitrix_tickets:', bitrixResult.reason);
      }

    } catch (err) {
      logError('General error in refreshData:', err);
      setError('Erro ao carregar dados. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }

  }, []);

  useEffect(() => {
    // Data routes require an authenticated session now (unlike the previous
    // permissive Supabase RLS), so wait for login before fetching.
    if (user) {
      refreshData();
    }
  }, [user, refreshData]);

  /**
   * Pipeline de derivação dos dados exibidos.
   *
   * Antes este bloco calculava o resultado num useMemo e em seguida copiava tudo
   * para seis estados via useEffect. Isso dobrava cada atualização (memo → efeito
   * → seis setState → novo render do provider → re-render de todos os consumidores)
   * sem nenhum ganho: os valores já eram derivados de `rawRows`. Agora são
   * consumidos direto do memo.
   *
   * Também havia três chamadas de calculateStats — a função mais cara do sistema —
   * sobre entradas comprovadamente idênticas (`filteredData` e `totalFilteredData`
   * eram construídas com o mesmo filtro). Ficou uma só.
   */
  const { collaborators, dashboard, totalDashboard, selectedRows, selectedOdooRows } = useMemo(() => {
    const vazio = {
      collaborators: [] as CollaboratorStats[],
      dashboard: null as DashboardStats | null,
      totalDashboard: null as DashboardStats | null,
      selectedRows: [] as SupportData[],
      selectedOdooRows: [] as SupportData[]
    };

    if (rawRows.length === 0) return vazio;

    const withinRange = (row: SupportData) => {
      const rowDate = new Date(row.data);
      // Use local components to match what the user sees in the UI
      const localDate = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
      return isWithinInterval(localDate, { start: dateRange.start, end: dateRange.end });
    };

    // Normalizado uma única vez: antes o toLowerCase() do termo era refeito para
    // cada campo de cada linha, ou seja, centenas de milhares de vezes por tecla.
    const termo = searchTerm.trim().toLowerCase();
    const camposIgnorados = new Set(['data', 'uploadId', 'isExcluded', 'exclusionReason', 'rawData']);

    const matchesSearch = (row: SupportData) => {
      if (termo === '') return true;
      for (const [key, val] of Object.entries(row)) {
        if (key === 'rawData') {
          if (val && Object.values(val).some(v => String(v).toLowerCase().includes(termo))) return true;
          continue;
        }
        if (camposIgnorados.has(key)) continue;
        if (String(val).toLowerCase().includes(termo)) return true;
      }
      return false;
    };

    const passaNosFiltros = (row: SupportData) => {
      if (dateFilter !== 'all' && !withinRange(row)) return false;
      if (filterStatus === 'included' && row.isExcluded) return false;
      if (filterStatus === 'excluded' && !row.isExcluded) return false;
      return matchesSearch(row);
    };

    // Uma única passada sobre rawRows separando chat e Odoo, no lugar de três
    // varreduras completas seguidas de três filtragens.
    const chatRows: SupportData[] = [];
    const odooRows: SupportData[] = [];
    for (const row of rawRows) {
      if (row.source === 'odoo') {
        if (passaNosFiltros(row)) odooRows.push(row);
      } else if (row.source === 'chat' || !row.source) {
        if (passaNosFiltros(row)) chatRows.push(row);
      }
    }

    if (chatRows.length === 0) {
      return { ...vazio, selectedOdooRows: odooRows };
    }

    const { collaborators: collabs, dashboard: dash } = calculateStats(chatRows, pointsConfig);

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
      // Mesma entrada, mesmo resultado: o dashboard "total" sempre respeitou os
      // mesmos filtros do dashboard de chat, então reaproveita o cálculo.
      totalDashboard: dash,
      selectedRows: chatRows,
      selectedOdooRows: odooRows
    };
  }, [rawRows, avatarMap, searchTerm, filterStatus, dateFilter, dateRange, pointsConfig]);

  const setOdooTicketsData = useCallback(async (tickets: any[], filename: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Create upload record
      const { data: upload } = await apiSend<{ data: any }>('/api/app-data/uploads', 'POST', { filename, row_count: tickets.length, source: 'odoo' });

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
      await apiSend('/api/app-data/support-data', 'PUT', { rows: supportDataFromOdoo });

      await refreshData();
    } catch (err: any) {
      logError('Error saving Odoo data:', err);
      setError(`Erro ao salvar Odoo: ${err.message}`);
    }
    setIsLoading(false);
  }, [refreshData]);

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
    if (indicators) setImportIndicators(indicators);
    if (logs) setImportLogs(logs);

    try {
      const { data: upload } = await apiSend<{ data: any }>('/api/app-data/uploads', 'POST', { filename, row_count: processedData.length, source });

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
            duracao_segundos: d.duracaoSegundos || null,
            tempo_resposta_segundos: d.tempoRespostaSegundos || null
          };
        });

        try {
          await apiSend('/api/app-data/support-data', 'PUT', { rows: chunk });
        } catch (dataErr: any) {
          if (dataErr.code === '23502') {
            // Fallback for NOT NULL violation: coerce nulls to 0 and retry
            const fallbackChunk = chunk.map(d => ({
              ...d,
              tempo_resposta: d.tempo_resposta === null ? 0 : d.tempo_resposta,
              duracao: d.duracao === null ? 0 : d.duracao,
              avaliacao: d.avaliacao === null ? 0 : d.avaliacao
            }));
            await apiSend('/api/app-data/support-data', 'PUT', { rows: fallbackChunk });
          } else {
            throw dataErr;
          }
        }
      }

      await refreshData();

    } catch (err: any) {

      logError('Error saving data:', err);

      const message = err?.message || JSON.stringify(err);

      setError(`Erro ao salvar no banco: ${message}`);

      const localId = Math.random().toString(36).substring(7);

      setUploads(prev => [
        { id: localId, filename, created_at: new Date().toISOString(), row_count: allRows.length },
        ...prev
      ]);

      // Fallback local: com as linhas em memória, colaboradores e dashboard são
      // recalculados sozinhos pelo memo de derivação.
      setRawRows(allRows);
    }

    setIsLoading(false);
  }, [refreshData]);

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

  const deleteUpload = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await apiSend(`/api/app-data/support-data?uploadId=${id}`, 'DELETE');
      await apiSend(`/api/app-data/uploads?id=${id}`, 'DELETE');
      await refreshData();
    } catch (err: any) {
      logError('Error deleting upload:', err);
      setError(`Erro ao excluir upload: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  const deleteCollaborator = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      await apiSend(`/api/app-data/support-data?colaborador=${encodeURIComponent(name)}`, 'DELETE');
      await apiSend(`/api/app-data/collaborator-settings?name=${encodeURIComponent(name)}`, 'DELETE');
      await refreshData();
    } catch (err: any) {
      logError('Error deleting collaborator:', err);
      setError(`Erro ao excluir colaborador: ${err?.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  /**
   * Atualização otimista das configurações de um colaborador.
   *
   * Escreve em `avatarMap`, que é a fonte que o memo de derivação consulta para
   * montar a lista de colaboradores. Antes essas funções mexiam direto na lista
   * derivada, o que só funcionava porque a lista ainda era um estado espelhado —
   * a próxima recalculada descartaria a alteração.
   */
  const patchCollaboratorSettings = useCallback((name: string, patch: Partial<{ url: string; options: any; badges: string[]; goals: any[] }>) => {
    setAvatarMap(prev => {
      const next = new Map(prev);
      const atual = next.get(name) || { url: '', options: undefined, badges: [], goals: [] };
      next.set(name, { ...atual, ...patch });
      return next;
    });
  }, []);

  const updateCollaboratorAvatar = useCallback(async (name: string, avatarUrl: string, options?: any) => {
    try {
      await apiSend('/api/app-data/collaborator-settings', 'PUT', { name, avatar_url: avatarUrl, avatar_options: options });
      patchCollaboratorSettings(name, { url: avatarUrl, options });
    } catch (err: any) {
      logError('Error updating avatar:', err);
      setError(`Erro ao atualizar avatar: ${err?.message}`);
    }
  }, [patchCollaboratorSettings]);

  const updateCollaboratorBadges = useCallback(async (name: string, badges: string[]) => {
    try {
      await apiSend('/api/app-data/collaborator-settings', 'PUT', { name, badges });
      patchCollaboratorSettings(name, { badges });
    } catch (err: any) {
      logError('Error updating badges:', err);
    }
  }, [patchCollaboratorSettings]);

  const updateCollaboratorGoals = useCallback(async (name: string, goals: any[]) => {
    try {
      await apiSend('/api/app-data/collaborator-settings', 'PUT', { name, goals });
      patchCollaboratorSettings(name, { goals });
    } catch (err: any) {
      logError('Error updating goals:', err);
    }
  }, [patchCollaboratorSettings]);

  const updateDashboardLayout = useCallback(async (layout: any[]) => {
    if (!user) {
      setDashboardLayout(layout);
      return;
    }

    try {
      // 1. Update the profile (last used layout)
      await apiSend('/api/profile/me', 'PATCH', { dashboard_layout: layout });

      // 2. If a named layout is selected, update it too
      if (selectedLayoutId) {
        await apiSend('/api/app-data/dashboard-layouts', 'PATCH', { id: selectedLayoutId, layout });

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
  }, [user, selectedLayoutId]);

  const updateQueueLayout = useCallback(async (layout: any[]) => {
    if (!user) return;

    try {
      setQueueLayout(layout);
      await apiSend('/api/profile/me', 'PATCH', { queue_layout: layout });
    } catch (err: any) {
      console.error('Error updating queue layout:', err);
    }
  }, [user]);

  const updateSettingsLayout = useCallback(async (layout: any[]) => {
    if (!user) {
      setSettingsLayout(layout);
      return;
    }

    try {
      setSettingsLayout(layout);
      await apiSend('/api/profile/me', 'PATCH', { settings_layout: layout });
    } catch (err: any) {
      console.error('Error updating settings layout:', err);
    }
  }, [user]);

  const saveDashboardLayout = useCallback(async (name: string, layout: any[], isDefault: boolean = false) => {
    if (!user) {
      console.warn('Save attempted without user');
      return;
    }

    try {
      console.log('Saving layout:', { name, userId: user.id });

      const { data } = await apiSend<{ data: any }>('/api/app-data/dashboard-layouts', 'POST', { name, layout, is_default: isDefault });

      if (!data) {
        throw new Error('Nenhum dado retornado após o salvamento.');
      }

      await fetchDashboardLayouts();
      setSelectedLayoutId(data.id);
      setDashboardLayout(layout);

      console.log('Layout saved successfully:', data.id);
    } catch (err: any) {
      console.error('Error saving dashboard layout:', err);
      setError(`Erro ao salvar layout: ${err.message || 'Erro desconhecido'}`);
    }
  }, [user, fetchDashboardLayouts]);

  const deleteDashboardLayout = useCallback(async (id: string) => {
    if (!user) return;

    try {
      await apiSend(`/api/app-data/dashboard-layouts?id=${id}`, 'DELETE');

      if (selectedLayoutId === id) {
        setSelectedLayoutId(null);
      }

      await fetchDashboardLayouts();
    } catch (err: any) {
      console.error('Error deleting dashboard layout:', err);
      setError(`Erro ao excluir layout: ${err.message}`);
    }
  }, [user, selectedLayoutId, fetchDashboardLayouts]);

  const selectDashboardLayout = useCallback(async (id: string) => {
    if (!id) {
      setSelectedLayoutId(null);
      return;
    }

    const layout = dashboardLayouts.find(l => l.id === id);
    if (layout) {
      setSelectedLayoutId(id);
      setDashboardLayout(layout.layout);

      // Also update profile as last used
      if (user) {
        await apiSend('/api/profile/me', 'PATCH', { dashboard_layout: layout.layout });
      }
    }
  }, [user, dashboardLayouts]);

  const toggleRowExclusion = useCallback(async (rowId: string, exclude: boolean, reason?: string) => {
    try {
      await apiSend('/api/app-data/support-data', 'PATCH', { id: rowId, is_excluded: exclude, exclusion_reason: reason });
      await refreshData();
    } catch (err: any) {
      logError('Error toggling row exclusion:', err);
      setError(`Erro ao ${exclude ? 'excluir' : 'restaurar'} item: ${err?.message}`);
    }
  }, [refreshData]);

  const updateRowNote = useCallback(async (rowId: string, note: string) => {
    try {
      await apiSend('/api/app-data/support-data', 'PATCH', { id: rowId, notes: note });
      await refreshData();
    } catch (err: any) {
      logError('Error updating row note:', err);
      setError(`Erro ao salvar nota: ${err?.message}`);
    }
  }, [refreshData]);

  const updateRowFields = useCallback(async (
    rowId: string,
    fields: { colaborador?: string; tempoRespostaSegundos?: number | null; avaliacao?: number }
  ) => {
    try {
      const payload: Record<string, any> = { id: rowId };
      if (fields.colaborador !== undefined) payload.colaborador = fields.colaborador;
      if (fields.tempoRespostaSegundos !== undefined) {
        payload.tempo_resposta_segundos = fields.tempoRespostaSegundos;
        payload.tempo_resposta = fields.tempoRespostaSegundos === null ? null : fields.tempoRespostaSegundos / 60;
      }
      if (fields.avaliacao !== undefined) payload.avaliacao = fields.avaliacao;
      await apiSend('/api/app-data/support-data', 'PATCH', payload);
      await refreshData();
    } catch (err: any) {
      logError('Error updating row fields:', err);
      setError(`Erro ao salvar edição: ${err?.message}`);
    }
  }, [refreshData]);

  const clearError = useCallback(() => setError(null), []);

  // Zerar as linhas basta: colaboradores e dashboard são derivados delas.
  const resetData = useCallback(() => setRawRows([]), []);

  const clearAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await apiSend('/api/app-data/support-data?all=true', 'DELETE');
      await apiSend('/api/app-data/uploads?all=true', 'DELETE');

      resetData();
      await refreshData();
    } catch (err: any) {
      console.error('Error clearing all data:', err);
      setError('Erro ao limpar dados do banco de dados.');
    } finally {
      setIsLoading(false);
    }
  }, [resetData, refreshData]);

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

  // Todo consumidor de useApp() re-renderiza quando esta referência muda. Sem o
  // memo era um objeto novo a cada render do provider, então qualquer mudança de
  // estado — inclusive as que não interessavam à tela aberta — repintava o app
  // inteiro. Com as ações em useCallback, a referência agora só muda quando um
  // dado realmente muda.
  const value = useMemo<AppState>(() => ({
        rawRows,
        collaborators,
        dashboard,
        totalDashboard,
        isLoading,
        uploads,
        selectedRows,
        selectedOdooRows,
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
        updateRowFields,
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
        refreshSession,
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
  }), [
    rawRows, collaborators, dashboard, totalDashboard, isLoading, uploads,
    selectedRows, selectedOdooRows, searchTerm, filterStatus, dateFilter,
    customRange, columnFilters, setColumnFilter, clearColumnFilters, dateRange,
    error, bitrixTickets, odooTickets, setRawData, setOdooTicketsData,
    syncOdooTickets, syncBitrixTickets, resetData, clearAllData, deleteUpload,
    deleteCollaborator, toggleRowExclusion, updateRowNote, updateRowFields,
    updateCollaboratorAvatar, updateCollaboratorBadges, updateCollaboratorGoals,
    refreshData, clearError, importLogs, importIndicators, user, userRole,
    userPermissions, isAuthReady, refreshSession, dashboardLayout, queueLayout,
    dashboardLayouts, selectedLayoutId, updateDashboardLayout, updateQueueLayout,
    updateSettingsLayout, saveDashboardLayout, deleteDashboardLayout,
    selectDashboardLayout, bitrixUsers, bitrixSchedules, loadingBitrix,
    fetchBitrixTimeman, fetchBitrixSchedules, handleTimemanAction,
    lastKnownDurations, settingsLayout, pointsConfig, updatePointsConfig
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {

  const context = useContext(AppContext);

  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
}
