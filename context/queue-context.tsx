'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { apiGet, apiSend } from '@/lib/api-client';
import { useApp } from '@/context/app-context';
import { format, startOfDay, isAfter, isBefore, isToday, parseISO } from 'date-fns';

export interface Operator {
  id: string;
  nome: string;
  horario_trabalho: string;
  status: 'Ativo' | 'Ausente';
  ausente_ate: string | null;
  ignorar_na_fila: boolean;
  posicao_fixa: number | null; // null = Livre, 1 = 1º, 2 = 2º, etc.
  created_at: string;
}

export interface Queue {
  id: string;
  data: string;
  responsavel_passagem_turno_id: string | null;
  created_at: string;
}

export interface QueueOperator {
  id: string;
  fila_id: string;
  operador_id: string;
  ordem: number;
  ticket_info: string;
  telefone_info: string;
  atendimento_tipo: 'Chamado' | 'Telefone' | 'Almoço' | 'Ausente';
  atendimento_hora: string;
  atendimento_obs: string;
  created_at: string;
  // Joined data
  operador?: Operator;
  checklist?: Checklist;
  almoco?: Lunch;
}

export interface Activity {
  id: string;
  operador_id: string;
  tipo: 'Chamado' | 'Telefone' | 'Almoço' | 'Ausente';
  horario: string;
  observacao: string;
  data: string;
  created_at: string;
  operador?: Operator;
}

export interface Checklist {
  id: string;
  fila_operador_id: string;
  vpn: boolean;
  ch_bitrix: boolean;
  ch_odoo: boolean;
  telefone: boolean;
  almoco: boolean;
}

export interface Lunch {
  id: string;
  fila_operador_id: string;
  horario: string | null;
}

export interface Schedule {
  id: string;
  data: string;
  tipo: 'terca' | 'quarta' | 'presencial';
  nomes: string;
  created_at: string;
}

interface QueueState {
  operators: Operator[];
  currentQueue: QueueOperator[];
  currentQueueData: Queue | null;
  availableDates: string[];
  activities: Activity[];
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCurrentQueue: (dateStr?: string) => Promise<void>;
  generateDailyQueue: (date?: Date) => Promise<void>;
  updateQueueOrder: (newOrder: QueueOperator[]) => Promise<void>;
  updateChecklist: (id: string, field: keyof Checklist, value: boolean) => Promise<void>;
  updateLunch: (id: string, horario: string) => Promise<void>;
  updateInfo: (id: string, field: 'atendimento_tipo' | 'atendimento_hora' | 'atendimento_obs', value: string) => Promise<void>;
  updateOperatorStatus: (id: string, status: 'Ativo' | 'Ausente', ausenteAte?: string | null) => Promise<void>;
  updateOperatorSchedule: (id: string, horario: string) => Promise<void>;
  updateOperatorPosition: (id: string, posicao: number | null) => Promise<void>;
  updateQueueHandover: (operadorId: string | null) => Promise<void>;
  addOperatorToQueue: (operadorId: string) => Promise<void>;
  addCollaboratorToQueue: (nome: string) => Promise<void>;
  removeOperatorFromQueue: (queueOperatorId: string) => Promise<void>;
  updateSchedule: (tipo: 'terca' | 'quarta' | 'presencial', names: string, dateStr: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  completeActivity: (id: string) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  exportQueueReport: (startDate: string, endDate: string) => Promise<any[]>;
}

const QueueContext = createContext<QueueState | undefined>(undefined);

/**
 * Os payloads da fila são pequenos (uma dezena de linhas), então comparar o JSON
 * sai muito mais barato do que o re-render em cascata que uma referência nova
 * dispara em toda a tela quando o conteúdo veio idêntico do servidor.
 */
function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function QueueProvider({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [currentQueue, setCurrentQueue] = useState<QueueOperator[]>([]);
  const [currentQueueData, setCurrentQueueData] = useState<Queue | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce timers for updateInfo, keyed by `${id}-${field}`, so text
  // inputs (e.g. observações) don't fire a PATCH on every keystroke.
  const updateInfoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = updateInfoTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const fetchOperators = useCallback(async () => {
    try {
      const { data } = await apiGet<{ data: Operator[] }>('/api/queue/operators');
      setOperators(prev => sameJson(prev, data || []) ? prev : (data || []));
    } catch (err) {
      console.error('Error fetching operators:', err);
    }
  }, []);

  // Data já renderizada na tela. Enquanto a data pedida for a mesma que já está
  // montada, o recarregamento acontece em segundo plano: sem esse controle, todo
  // refetch ligava `isLoading` e o dashboard trocava a fila inteira por um
  // spinner, o que aparecia como a tela "piscando".
  const loadedDateRef = useRef<string | null>(null);

  const fetchCurrentQueue = useCallback(async (dateStr: string = format(new Date(), 'yyyy-MM-dd')) => {
    const isFirstLoadForDate = loadedDateRef.current !== dateStr;
    if (isFirstLoadForDate) setIsLoading(true);

    try {
      // As três leituras iniciais não dependem umas das outras.
      const [{ data: dates }, { data: activitiesData }, { data: queueData }] = await Promise.all([
        apiGet<{ data: string[] }>('/api/queue/filas?dates=true'),
        apiGet<{ data: Activity[] }>(`/api/queue/atividades?date=${dateStr}`),
        apiGet<{ data: Queue | null }>(`/api/queue/filas?date=${dateStr}`)
      ]);

      setAvailableDates(prev => sameJson(prev, dates || []) ? prev : (dates || []));
      setActivities(prev => sameJson(prev, activitiesData || []) ? prev : (activitiesData || []));

      if (queueData) {
        setCurrentQueueData(prev => sameJson(prev, queueData) ? prev : queueData);
        const { data: queueOps } = await apiGet<{ data: QueueOperator[] }>(`/api/queue/fila-operadores?filaId=${queueData.id}`);
        setCurrentQueue(prev => sameJson(prev, queueOps || []) ? prev : (queueOps || []));
      } else {
        setCurrentQueueData(null);
        setCurrentQueue([]);
      }

      loadedDateRef.current = dateStr;
    } catch (err: any) {
      console.error('Error fetching queue:', err);
      setError(err.message);
    } finally {
      if (isFirstLoadForDate) setIsLoading(false);
    }
  }, []);

  const fetchActivities = async (dateStr: string = format(new Date(), 'yyyy-MM-dd')) => {
    try {
      const { data } = await apiGet<{ data: Activity[] }>(`/api/queue/atividades?date=${dateStr}`);
      setActivities(data || []);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
    }
  };

  const generateDailyQueue = useCallback(async (date: Date = new Date()) => {
    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Check if queue already exists
      const { data: existingQueue } = await apiGet<{ data: Queue | null }>(`/api/queue/filas?date=${dateStr}`);

      let queueId = existingQueue?.id;

      if (queueId) {
        // If it's a past date, just load and return (NEVER refactor past)
        const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
        if (isPast) {
          await fetchCurrentQueue(dateStr);
          return;
        }

        // Check if it has operators
        const { data: existingOps } = await apiGet<{ data: { id: string }[] }>(`/api/queue/fila-operadores?filaId=${queueId}&plain=true`);

        if (existingOps && existingOps.length > 0) {
          // If we are here, it's today or future.
          // We only auto-load if we are NOT explicitly refactoring.
          // Since generateDailyQueue is called for refactoring too,
          // we should check if we want to delete existing ops.

          // For now, let's assume if it exists and we call this, we want to REFACTOR (update)
          // but only if no activities have been recorded yet for today to avoid data loss.
          const { data: activitiesToday } = await apiGet<{ data: Activity[] }>(`/api/queue/atividades?date=${dateStr}`);

          if (activitiesToday && activitiesToday.length > 0 && isToday(date)) {
            await fetchCurrentQueue(dateStr);
            return;
          }
        }
      }

      // Get previous queue for rotation and active operators in parallel - they
      // don't depend on each other, so there's no reason to serialize the round trips.
      const yesterday = format(startOfDay(new Date(date.getTime() - 86400000)), 'yyyy-MM-dd');
      const [{ data: prevQueue }, { data: activeOps }] = await Promise.all([
        apiGet<{ data: Queue | null }>(`/api/queue/filas?date=${yesterday}`),
        apiGet<{ data: Operator[] }>('/api/queue/operators?activeOnly=true')
      ]);

      let baseOrder: string[] = [];
      if (prevQueue) {
        const { data: prevOps } = await apiGet<{ data: { operador_id: string }[] }>(`/api/queue/fila-operadores?filaId=${prevQueue.id}&plain=true`);
        if (prevOps) {
          baseOrder = prevOps.map(o => o.operador_id);
        }
      }

      if (!activeOps) throw new Error('Nenhum operador encontrado.');

      // Filter out absent operators
      const availableOps = activeOps.filter(op => {
        if (op.status === 'Ausente' && op.ausente_ate) {
          return isAfter(new Date(), parseISO(op.ausente_ate));
        }
        return true;
      });

      // 1. Separate Fixed vs Livre
      const fixedOps = availableOps.filter(op => op.posicao_fixa !== null).sort((a, b) => (a.posicao_fixa || 0) - (b.posicao_fixa || 0));
      const livreOps = availableOps.filter(op => op.posicao_fixa === null);

      // 2. Apply rotation to Livre operators only
      let rotatedLivre = [...livreOps];
      if (baseOrder.length > 0) {
        // Sort livreOps based on their relative order in baseOrder
        const livreInBase = baseOrder.filter(id => livreOps.some(op => op.id === id));
        const livreNotInBase = livreOps.filter(op => !baseOrder.includes(op.id));

        const sortedLivre = [
          ...livreInBase.map(id => livreOps.find(op => op.id === id)).filter(Boolean) as Operator[],
          ...livreNotInBase
        ];

        // Rotation: The last person of yesterday's queue (among livres)
        // becomes the FIRST person today and receives the handover (passagem).
        if (sortedLivre.length > 1) {
          const last = sortedLivre[sortedLivre.length - 1];
          const others = sortedLivre.slice(0, -1);
          rotatedLivre = [last, ...others];
        } else {
          rotatedLivre = sortedLivre;
        }
      }

      // 3. Construct final order by placing fixed ops in their slots
      const totalOps = availableOps.length;
      if (totalOps === 0) throw new Error('Nenhum operador disponível para gerar a fila.');

      const finalOrder: Operator[] = new Array(totalOps).fill(null);

      // Place fixed (avoiding duplicates or out of bounds)
      const livrePool = [...rotatedLivre];

      fixedOps.forEach(op => {
        const pos = (op.posicao_fixa || 1) - 1;
        if (pos >= 0 && pos < totalOps && finalOrder[pos] === null) {
          finalOrder[pos] = op;
        } else {
          // If position is taken or invalid, treat as livre for now
          livrePool.push(op);
        }
      });

      // Fill remaining with livre pool
      for (let i = 0; i < totalOps; i++) {
        if (finalOrder[i] === null) {
          const nextOp = livrePool.shift();
          if (nextOp) {
            finalOrder[i] = nextOp;
          }
        }
      }

      // Filter out any remaining nulls just in case
      const cleanedOrder = finalOrder.filter((op): op is Operator => op !== null);

      // 4. Determine shift handover (1st operator after fixed positions)
      // This person will be the last in the next day's queue.
      const firstNonFixed = cleanedOrder.find(op => op.posicao_fixa === null);
      const shiftHandoverId = firstNonFixed ? firstNonFixed.id : (cleanedOrder.length > 0 ? cleanedOrder[0].id : null);

      // 5. Create or update queue
      if (!queueId) {
        const { data: newQueue } = await apiSend<{ data: Queue }>('/api/queue/filas', 'POST', {
          data: dateStr,
          responsavel_passagem_turno_id: shiftHandoverId
        });
        queueId = newQueue.id;
      } else {
        // Update shift handover for refactor
        await apiSend('/api/queue/filas', 'PATCH', { id: queueId, responsavel_passagem_turno_id: shiftHandoverId });
      }

      // 6. Sync operators into queue (Upsert logic to preserve IDs and linked data)
      const { data: existingQueueOps } = await apiGet<{ data: { id: string; operador_id: string }[] }>(`/api/queue/fila-operadores?filaId=${queueId}&plain=true`);

      const existingOpsMap = new Map((existingQueueOps || []).map(op => [op.operador_id, op.id]));

      const opsToUpsert = cleanedOrder.map((op, index) => {
        const existingId = existingOpsMap.get(op.id);
        const record: any = {
          fila_id: queueId,
          operador_id: op.id,
          ordem: index,
          atendimento_tipo: 'Chamado'
        };
        if (existingId) record.id = existingId;
        return record;
      });

      if (opsToUpsert.length === 0) return;

      const { data: upsertedOps } = await apiSend<{ data: any[] }>('/api/queue/fila-operadores', 'PUT', { rows: opsToUpsert });

      // Delete operators that are no longer in the final order
      const finalOpIds = new Set(cleanedOrder.map(op => op.id));
      const idsToDelete = (existingQueueOps || [])
        .filter(op => !finalOpIds.has(op.operador_id))
        .map(op => op.id);

      if (idsToDelete.length > 0) {
        await apiSend('/api/queue/fila-operadores', 'DELETE', { ids: idsToDelete });
      }

      // 7. Ensure checklists and lunches exist for all operators
      if (upsertedOps && upsertedOps.length > 0) {
        const opIds = upsertedOps.map(op => op.id);

        // Checklist and lunch existence checks are independent - run them together.
        const [{ data: existingChecklistIds }, { data: existingLunchIds }] = await Promise.all([
          apiGet<{ data: string[] }>(`/api/queue/checklists?filaOperadorIds=${opIds.join(',')}`),
          apiGet<{ data: string[] }>(`/api/queue/almocos?filaOperadorIds=${opIds.join(',')}`)
        ]);

        const existingChecklistSet = new Set(existingChecklistIds || []);
        const checklistIdsToInsert = opIds.filter(id => !existingChecklistSet.has(id));

        const existingLunchSet = new Set(existingLunchIds || []);
        const lunchIdsToInsert = opIds.filter(id => !existingLunchSet.has(id));

        await Promise.all([
          checklistIdsToInsert.length > 0
            ? apiSend('/api/queue/checklists', 'POST', { filaOperadorIds: checklistIdsToInsert })
            : Promise.resolve(),
          lunchIdsToInsert.length > 0
            ? apiSend('/api/queue/almocos', 'POST', { filaOperadorIds: lunchIdsToInsert })
            : Promise.resolve()
        ]);
      }

      fetchCurrentQueue(dateStr);
    } catch (err: any) {
      console.error('Error generating queue:', err);
      setError(err.message || 'Erro desconhecido ao gerar fila');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentQueue]);

  const updateQueueOrder = async (newOrder: QueueOperator[]) => {
    if (!currentQueueData) return;
    try {
      const updates = newOrder.map((op, index) => ({
        id: op.id,
        fila_id: op.fila_id,
        operador_id: op.operador_id,
        ordem: index
      }));

      await apiSend('/api/queue/fila-operadores', 'PUT', { rows: updates });

      // New Rule: The 1st operator after fixed positions becomes the "Passagem" holder
      // and will be the last in the next day's queue.
      const firstNonFixed = newOrder.find(op => op.operador?.posicao_fixa === null);
      const handoverOp = firstNonFixed || newOrder[0];

      if (handoverOp && handoverOp.operador_id !== currentQueueData.responsavel_passagem_turno_id) {
        await apiSend('/api/queue/filas', 'PATCH', { id: currentQueueData.id, responsavel_passagem_turno_id: handoverOp.operador_id });
        setCurrentQueueData(prev => prev ? { ...prev, responsavel_passagem_turno_id: handoverOp.operador_id } : null);
      }

      setCurrentQueue(newOrder);
    } catch (err: any) {
      console.error('Error updating order:', err);
    }
  };

  const updateChecklist = async (id: string, field: keyof Checklist, value: boolean) => {
    try {
      await apiSend('/api/queue/checklists', 'PATCH', { filaOperadorId: id, field, value });

      setCurrentQueue(prev => prev.map(op =>
        op.id === id ? { ...op, checklist: { ...op.checklist!, [field]: value } } : op
      ));
    } catch (err: any) {
      console.error('Error updating checklist:', err);
    }
  };

  const updateLunch = async (id: string, horario: string) => {
    try {
      await apiSend('/api/queue/almocos', 'PATCH', { filaOperadorId: id, horario });

      setCurrentQueue(prev => prev.map(op =>
        op.id === id ? { ...op, almoco: { ...op.almoco!, horario } } : op
      ));
    } catch (err: any) {
      console.error('Error updating lunch:', err);
    }
  };

  const updateInfo = async (id: string, field: 'atendimento_tipo' | 'atendimento_hora' | 'atendimento_obs', value: string) => {
    const op = currentQueue.find(o => o.id === id);
    const updates: any = { [field]: value };

    // Auto-fill time if empty and user is typing obs or changing type
    if ((field === 'atendimento_obs' || field === 'atendimento_tipo') && (!op?.atendimento_hora)) {
      updates.atendimento_hora = format(new Date(), 'HH:mm');
    }

    // Reflect the change locally right away so the input stays responsive.
    setCurrentQueue(prev => prev.map(o =>
      o.id === id ? { ...o, ...updates } : o
    ));

    // Debounce the network call per field so continuous typing (e.g. in the
    // observações field) doesn't fire a PATCH request on every keystroke.
    const timerKey = `${id}-${field}`;
    clearTimeout(updateInfoTimers.current[timerKey]);
    updateInfoTimers.current[timerKey] = setTimeout(async () => {
      delete updateInfoTimers.current[timerKey];
      try {
        await apiSend('/api/queue/fila-operadores', 'PATCH', { id, ...updates });
      } catch (err: any) {
        console.error('Error updating info:', err);
        setError(err.message);
      }
    }, 600);
  };

  const updateOperatorStatus = async (id: string, status: 'Ativo' | 'Ausente', ausenteAte?: string | null) => {
    try {
      await apiSend('/api/queue/operators', 'PATCH', { id, status, ausente_ate: ausenteAte });
      fetchOperators();
    } catch (err: any) {
      console.error('Error updating operator status:', err);
    }
  };

  const updateOperatorSchedule = async (id: string, horario: string) => {
    try {
      await apiSend('/api/queue/operators', 'PATCH', { id, horario_trabalho: horario });
      setOperators(prev => prev.map(op => op.id === id ? { ...op, horario_trabalho: horario } : op));
    } catch (err: any) {
      console.error('Error updating operator schedule:', err);
    }
  };

  const updateOperatorPosition = async (id: string, posicao: number | null) => {
    try {
      await apiSend('/api/queue/operators', 'PATCH', { id, posicao_fixa: posicao });
      setOperators(prev => prev.map(op => op.id === id ? { ...op, posicao_fixa: posicao } : op));
    } catch (err: any) {
      console.error('Error updating operator position:', err);
    }
  };

  const updateQueueHandover = async (operadorId: string | null) => {
    if (!currentQueueData) return;
    try {
      await apiSend('/api/queue/filas', 'PATCH', { id: currentQueueData.id, responsavel_passagem_turno_id: operadorId });
      setCurrentQueueData(prev => prev ? { ...prev, responsavel_passagem_turno_id: operadorId } : null);
    } catch (err: any) {
      console.error('Error updating handover:', err);
    }
  };

  const addOperatorToQueue = async (operadorId: string) => {
    if (!currentQueueData) throw new Error('Nenhuma fila carregada para esta data.');
    if (currentQueue.some(q => q.operador_id === operadorId)) return;

    const filaId = currentQueueData.id;
    const nextOrder = currentQueue.length;

    const { data: newOp } = await apiSend<{ data: { id: string } }>('/api/queue/fila-operadores', 'POST', { fila_id: filaId, operador_id: operadorId, ordem: nextOrder });

    await apiSend('/api/queue/checklists', 'POST', { filaOperadorIds: [newOp.id] });
    await apiSend('/api/queue/almocos', 'POST', { filaOperadorIds: [newOp.id] });

    // Recarrega a fila da data que está aberta, e não a de hoje.
    await fetchCurrentQueue(currentQueueData.data);
  };

  // Inclui na fila alguém que aparece na lista de colaboradores mas ainda não
  // tem cadastro de operador. O operador é criado com `ignorar_na_fila = false`,
  // então a partir daí ele entra sozinho nas filas dos próximos dias, seguindo
  // o rodízio normal.
  const addCollaboratorToQueue = async (nome: string) => {
    const { data: operador } = await apiSend<{ data: Operator }>('/api/queue/operators', 'POST', { nome });
    await fetchOperators();
    await addOperatorToQueue(operador.id);
  };

  const removeOperatorFromQueue = async (queueOperatorId: string) => {
    try {
      await apiSend('/api/queue/fila-operadores', 'DELETE', { ids: [queueOperatorId] });
      fetchCurrentQueue(currentQueueData?.data);
    } catch (err: any) {
      console.error('Error removing operator from queue:', err);
    }
  };

  const fetchSchedules = useCallback(async () => {
    try {
      const { data } = await apiGet<{ data: Schedule[] }>('/api/queue/escalas');
      setSchedules(prev => sameJson(prev, data || []) ? prev : (data || []));
    } catch (err: any) {
      console.error('Error fetching schedules:', err);
    }
  }, []);

  const updateSchedule = async (tipo: 'terca' | 'quarta' | 'presencial', names: string, dateStr: string) => {
    try {
      const { data } = await apiSend<{ data: Schedule }>('/api/queue/escalas', 'POST', { tipo, nomes: names, data: dateStr });
      if (!data) throw new Error('A operação foi concluída, mas nenhum dado foi retornado.');

      setSchedules(prev => {
        const existingIdx = prev.findIndex(s => s.data === dateStr && s.tipo === tipo);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = data;
          return next;
        }
        return [...prev, data].sort((a, b) => a.data.localeCompare(b.data));
      });
    } catch (err: any) {
      const errorMessage = err?.message || (typeof err === 'string' ? err : 'Erro desconhecido');
      console.error(`Error updating schedule:`, errorMessage);

      const typeLabel = tipo === 'presencial' ? 'Presencial' : (tipo === 'terca' ? 'Terça' : 'Quarta');
      const userFriendlyMessage = `Erro ao salvar "Escala: ${typeLabel}": ${errorMessage}`;

      const isAuthError = err?.status === 401;
      if (isAuthError) {
        if (typeof window !== 'undefined') {
          alert('Sessão expirada. Por favor, faça login novamente.');
          window.location.href = '/';
        }
      } else {
        if (typeof window !== 'undefined') {
          alert(userFriendlyMessage);
        }
      }
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await apiSend('/api/queue/escalas?id=' + id, 'DELETE');
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      const errorMsg = err?.message || (typeof err === 'string' ? err : 'Erro desconhecido');
      console.error('Error deleting schedule:', errorMsg);

      const isAuthError = err?.status === 401;
      if (isAuthError) {
        if (typeof window !== 'undefined') {
          alert('Sessão expirada. Por favor, faça login novamente.');
          window.location.href = '/';
        }
      } else {
        if (typeof window !== 'undefined') {
          alert(`Erro ao excluir escala: ${errorMsg}`);
        }
      }
    }
  };

  const completeActivity = async (id: string) => {
    try {
      const opToMove = currentQueue.find(op => op.id === id);
      if (!opToMove) return;

      const time = format(new Date(), 'HH:mm');
      const finalTime = opToMove.atendimento_hora || time;

      // 1. Save to activities history
      await apiSend('/api/queue/atividades', 'POST', {
        operador_id: opToMove.operador_id,
        tipo: opToMove.atendimento_tipo || 'Chamado',
        horario: finalTime,
        observacao: opToMove.atendimento_obs || '',
        data: format(new Date(), 'yyyy-MM-dd')
      });

      // 2. Update the record (Reset fields for next turn)
      // Note: We keep checklist and lunch persistent as requested
      await apiSend('/api/queue/fila-operadores', 'PATCH', {
        id,
        atendimento_hora: '',
        atendimento_obs: '',
        atendimento_tipo: 'Chamado' // Reset to default
      });

      // 3. Move to end of queue
      const otherOps = currentQueue.filter(op => op.id !== id);
      const newOrder = [...otherOps, opToMove];

      // Update local state first for immediate feedback
      setCurrentQueue(newOrder.map((op, idx) => ({
        ...op,
        ordem: idx,
        atendimento_hora: op.id === id ? '' : op.atendimento_hora,
        atendimento_obs: op.id === id ? '' : op.atendimento_obs,
        atendimento_tipo: op.id === id ? 'Chamado' : op.atendimento_tipo
      })));

      // Update database
      const updates = newOrder.map((op, idx) => ({
        id: op.id,
        fila_id: op.fila_id,
        operador_id: op.operador_id,
        ordem: idx
      }));

      await apiSend('/api/queue/fila-operadores', 'PUT', { rows: updates });

      // 4. Refresh activities
      fetchActivities();
    } catch (err: any) {
      console.error('Error completing activity:', err);
    }
  };

  const deleteActivity = async (activityId: string) => {
    try {
      const activityToDelete = activities.find(a => a.id === activityId);
      if (!activityToDelete) return;

      // 1. Delete the activity
      await apiSend('/api/queue/atividades?id=' + activityId, 'DELETE');

      // 2. Refresh activities list
      fetchActivities();

      // 3. If they are currently at the END of the queue, return them to the top.
      const opInQueue = currentQueue.find(op => op.operador_id === activityToDelete.operador_id);
      if (opInQueue && opInQueue.ordem === currentQueue.length - 1) {
        // Move to front: ordem 0
        const otherOps = currentQueue.filter(op => op.id !== opInQueue.id);
        const newOrder = [opInQueue, ...otherOps];

        const updates = newOrder.map((op, idx) => ({
          id: op.id,
          fila_id: op.fila_id,
          operador_id: op.operador_id,
          ordem: idx
        }));

        await apiSend('/api/queue/fila-operadores', 'PUT', { rows: updates });

        setCurrentQueue(newOrder.map((op, idx) => ({ ...op, ordem: idx })));
      }
    } catch (err: any) {
      console.error('Error deleting activity:', err);
    }
  };

  const exportQueueReport = async (startDate: string, endDate: string) => {
    try {
      // Fetch all queues in range
      const { data: queues } = await apiGet<{ data: Queue[] }>(`/api/queue/filas?start=${startDate}&end=${endDate}`);

      const reportData: any[] = [];

      for (const queue of queues) {
        // Fetch queue operators
        const { data: queueOps } = await apiGet<{ data: QueueOperator[] }>(`/api/queue/fila-operadores?filaId=${queue.id}`);

        // Fetch activities for this specifically targeted date to be sure
        const { data: activityData } = await apiGet<{ data: Activity[] }>(`/api/queue/atividades?date=${queue.data}`);

        // Group activities by operator
        const activitiesByOp: Record<string, any[]> = {};
        if (activityData) {
          activityData.forEach(act => {
            if (!activitiesByOp[act.operador_id]) {
              activitiesByOp[act.operador_id] = [];
            }
            activitiesByOp[act.operador_id].push(act);
          });
        }

        // Create flattened rows for the report
        if (queueOps) {
          queueOps.forEach(op => {
            const opActivities = activitiesByOp[op.operador_id] || [];

            reportData.push({
              Data: queue.data,
              Ordem: op.ordem + 1,
              Analista: op.operador?.nome,
              Passagem: op.operador_id === queue.responsavel_passagem_turno_id ? 'Sim' : '-',
              Horario_Trabalho: op.operador?.horario_trabalho,
              Status_Fila: op.atendimento_tipo || 'Pendente',
              Hora_Acao: op.atendimento_hora || '-',
              Obs_Acao: op.atendimento_obs || '-',
              Almoco_Horario: op.almoco?.horario || '-',
              VPN: op.checklist?.vpn ? 'OK' : '-',
              Bitrix: op.checklist?.ch_bitrix ? 'OK' : '-',
              Odoo: op.checklist?.ch_odoo ? 'OK' : '-',
              Telefone: op.checklist?.telefone ? 'OK' : '-',
              Checklist_Almoco: op.checklist?.almoco ? 'OK' : '-',
              Historico_Acoes: opActivities.map(a => `${a.tipo} (${a.horario})${a.observacao ? ': ' + a.observacao : ''}`).join(' | ')
            });
          });
        }
      }

      return reportData;
    } catch (err: any) {
      console.error('Error exporting report:', err);
      setError(err.message);
      return [];
    }
  };

  useEffect(() => {
    // Queue routes require an authenticated session now (unlike the previous
    // permissive Supabase RLS), so wait for login before fetching.
    // A fila do dia não é carregada aqui: quem manda na data exibida é o
    // QueueDashboard, que chama fetchCurrentQueue(selectedDate) ao montar.
    // Buscar aqui também significava duas cargas completas simultâneas.
    if (user) {
      fetchOperators();
      fetchSchedules();
    }
  }, [user, fetchOperators, fetchSchedules]);

  // Sem useMemo de propósito: as ações abaixo fecham sobre currentQueue /
  // currentQueueData e são recriadas a cada render de qualquer forma, e o único
  // consumidor deste contexto é o QueueDashboard — que já re-renderiza quando o
  // estado da fila muda. Um memo aqui só adicionaria uma lista de dependências
  // grande e fácil de deixar desatualizada, sem evitar nenhum render.
  const value: QueueState = {
    operators,
    currentQueue,
    currentQueueData,
    availableDates,
    activities,
    schedules,
    isLoading,
    error,
    fetchCurrentQueue,
    generateDailyQueue,
    updateQueueOrder,
    updateChecklist,
    updateLunch,
    updateInfo,
    updateOperatorStatus,
    updateOperatorSchedule,
    updateOperatorPosition,
    updateQueueHandover,
    addOperatorToQueue,
    addCollaboratorToQueue,
    removeOperatorFromQueue,
    updateSchedule,
    deleteSchedule,
    completeActivity,
    deleteActivity,
    exportQueueReport
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
}
