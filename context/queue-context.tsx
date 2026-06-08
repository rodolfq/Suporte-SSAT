'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
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
  historyQueues: Record<string, QueueOperator[]>;
  availableDates: string[];
  activities: Activity[];
  schedules: Schedule[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchOperators: () => Promise<void>;
  fetchCurrentQueue: (dateStr?: string) => Promise<void>;
  fetchActivities: (dateStr?: string) => Promise<void>;
  fetchAvailableDates: () => Promise<void>;
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
  removeOperatorFromQueue: (queueOperatorId: string) => Promise<void>;
  fetchHistory: (date: string) => Promise<void>;
  updateSchedule: (tipo: 'terca' | 'quarta' | 'presencial', names: string, dateStr: string) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  completeActivity: (id: string) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  exportQueueReport: (startDate: string, endDate: string) => Promise<any[]>;
}

const QueueContext = createContext<QueueState | undefined>(undefined);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [currentQueue, setCurrentQueue] = useState<QueueOperator[]>([]);
  const [currentQueueData, setCurrentQueueData] = useState<Queue | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [historyQueues, setHistoryQueues] = useState<Record<string, QueueOperator[]>>({});
  const [activities, setActivities] = useState<Activity[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperators = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('operadores')
      .select('*')
      .order('posicao_fixa', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true });
    
    if (error) {
      console.error('Error fetching operators:', error);
      return;
    }
    setOperators(data || []);
  }, []);

  const fetchCurrentQueue = useCallback(async (dateStr: string = format(new Date(), 'yyyy-MM-dd')) => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      // Refresh available dates list too
      const { data: dateData } = await supabase
        .from('filas')
        .select('data')
        .order('data', { ascending: false });
      
      if (dateData) {
        setAvailableDates(Array.from(new Set(dateData.map((f: any) => f.data))) as string[]);
      }

      // Get activities for the day
      const { data: activitiesData } = await supabase
        .from('atividades')
        .select('*, operador:operadores(*)')
        .eq('data', dateStr)
        .order('created_at', { ascending: false });
      
      setActivities(activitiesData || []);

      // Get the queue for the date
      const { data: queueData, error: queueError } = await supabase
        .from('filas')
        .select('*')
        .eq('data', dateStr)
        .single();

      if (queueError && queueError.code !== 'PGRST116') {
        throw queueError;
      }

      if (queueData) {
        setCurrentQueueData(queueData);
        // Get operators in the queue
        const { data: queueOps, error: opsError } = await supabase
          .from('fila_operadores')
          .select(`
            *,
            operador:operadores(*),
            checklist:checklists(*),
            almoco:almocos(*)
          `)
          .eq('fila_id', queueData.id)
          .order('ordem');

        if (opsError) throw opsError;
        setCurrentQueue(queueOps || []);
      } else {
        setCurrentQueueData(null);
        setCurrentQueue([]);
      }
    } catch (err: any) {
      console.error('Error fetching queue:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchActivities = async (dateStr: string = format(new Date(), 'yyyy-MM-dd')) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('atividades')
        .select('*, operador:operadores(*)')
        .eq('data', dateStr)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.error('Error fetching activities:', err);
    }
  };

  const fetchAvailableDates = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('filas')
        .select('data')
        .order('data', { ascending: false });
      
      if (data) {
        setAvailableDates(Array.from(new Set(data.map((f: any) => f.data))) as string[]);
      }
    } catch (err) {
      console.error('Error fetching available dates:', err);
    }
  }, []);

  const generateDailyQueue = useCallback(async (date: Date = new Date()) => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Check if queue already exists
      const { data: existingQueue } = await supabase
        .from('filas')
        .select('id')
        .eq('data', dateStr)
        .maybeSingle();

      let queueId = existingQueue?.id;

      if (queueId) {
        // If it's a past date, just load and return (NEVER refactor past)
        const isPast = isBefore(startOfDay(date), startOfDay(new Date()));
        if (isPast) {
          await fetchCurrentQueue(dateStr);
          return;
        }

        // Check if it has operators
        const { data: existingOps } = await supabase
          .from('fila_operadores')
          .select('id')
          .eq('fila_id', queueId);
        
        if (existingOps && existingOps.length > 0) {
          // If we are here, it's today or future.
          // We only auto-load if we are NOT explicitly refactoring.
          // Since generateDailyQueue is called for refactoring too, 
          // we should check if we want to delete existing ops.
          
          // For now, let's assume if it exists and we call this, we want to REFACTOR (update)
          // but only if no activities have been recorded yet for today to avoid data loss.
          const { data: hasActivities } = await supabase
            .from('atividades')
            .select('id')
            .eq('data', dateStr)
            .limit(1);

          if (hasActivities && hasActivities.length > 0 && isToday(date)) {
            await fetchCurrentQueue(dateStr);
            return;
          }
        }
      }

      // Get previous queue for rotation
      const yesterday = format(startOfDay(new Date(date.getTime() - 86400000)), 'yyyy-MM-dd');
      const { data: prevQueue } = await supabase
        .from('filas')
        .select('id, responsavel_passagem_turno_id')
        .eq('data', yesterday)
        .maybeSingle();

      let baseOrder: string[] = [];
      if (prevQueue) {
        const { data: prevOps } = await supabase
          .from('fila_operadores')
          .select('operador_id')
          .eq('fila_id', prevQueue.id)
          .order('ordem');
        
        if (prevOps) {
          baseOrder = prevOps.map(o => o.operador_id);
        }
      }

      // Get active operators
      const { data: activeOps } = await supabase
        .from('operadores')
        .select('*')
        .eq('ignorar_na_fila', false);

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
        const { data: newQueue, error: createError } = await supabase
          .from('filas')
          .insert([{ 
            data: dateStr,
            responsavel_passagem_turno_id: shiftHandoverId
          }])
          .select()
          .single();

        if (createError) throw createError;
        queueId = newQueue.id;
      } else {
        // Update shift handover for refactor
        await supabase
          .from('filas')
          .update({ responsavel_passagem_turno_id: shiftHandoverId })
          .eq('id', queueId);
      }

      // 6. Sync operators into queue (Upsert logic to preserve IDs and linked data)
      const { data: existingQueueOps } = await supabase
        .from('fila_operadores')
        .select('id, operador_id')
        .eq('fila_id', queueId);

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

      const { data: upsertedOps, error: upsertError } = await supabase
        .from('fila_operadores')
        .upsert(opsToUpsert)
        .select();

      if (upsertError) throw upsertError;

      // Delete operators that are no longer in the final order
      const finalOpIds = new Set(cleanedOrder.map(op => op.id));
      const idsToDelete = (existingQueueOps || [])
        .filter(op => !finalOpIds.has(op.operador_id))
        .map(op => op.id);

      if (idsToDelete.length > 0) {
        await supabase.from('fila_operadores').delete().in('id', idsToDelete);
      }

      // 7. Ensure checklists and lunches exist for all operators
      if (upsertedOps && upsertedOps.length > 0) {
        const opIds = upsertedOps.map(op => op.id);
        
        // Check existing checklists
        const { data: existingChecklists } = await supabase
          .from('checklists')
          .select('fila_operador_id')
          .in('fila_operador_id', opIds);
        
        const existingChecklistIds = new Set(existingChecklists?.map(c => c.fila_operador_id) || []);
        const checklistsToInsert = upsertedOps
          .filter(op => !existingChecklistIds.has(op.id))
          .map(op => ({ fila_operador_id: op.id }));

        if (checklistsToInsert.length > 0) {
          await supabase.from('checklists').insert(checklistsToInsert);
        }

        // Check existing lunches
        const { data: existingLunches } = await supabase
          .from('almocos')
          .select('fila_operador_id')
          .in('fila_operador_id', opIds);
        
        const existingLunchIds = new Set(existingLunches?.map(l => l.fila_operador_id) || []);
        const lunchesToInsert = upsertedOps
          .filter(op => !existingLunchIds.has(op.id))
          .map(op => ({ fila_operador_id: op.id }));

        if (lunchesToInsert.length > 0) {
          await supabase.from('almocos').insert(lunchesToInsert);
        }
      }

      fetchCurrentQueue(dateStr);
    } catch (err: any) {
      console.error('Error generating queue:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
      setError(err.message || 'Erro desconhecido ao gerar fila');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCurrentQueue]);

  const updateQueueOrder = async (newOrder: QueueOperator[]) => {
    if (!supabase || !currentQueueData) return;
    try {
      const updates = newOrder.map((op, index) => ({
        id: op.id,
        ordem: index
      }));

      const { error } = await supabase.from('fila_operadores').upsert(updates);
      if (error) throw error;

      // New Rule: The 1st operator after fixed positions becomes the "Passagem" holder
      // and will be the last in the next day's queue.
      const firstNonFixed = newOrder.find(op => op.operador?.posicao_fixa === null);
      const handoverOp = firstNonFixed || newOrder[0];

      if (handoverOp && handoverOp.operador_id !== currentQueueData.responsavel_passagem_turno_id) {
        const { error: queueError } = await supabase
          .from('filas')
          .update({ responsavel_passagem_turno_id: handoverOp.operador_id })
          .eq('id', currentQueueData.id);
        
        if (!queueError) {
          setCurrentQueueData(prev => prev ? { ...prev, responsavel_passagem_turno_id: handoverOp.operador_id } : null);
        }
      }

      setCurrentQueue(newOrder);
    } catch (err: any) {
      console.error('Error updating order:', err);
    }
  };

  const updateChecklist = async (id: string, field: keyof Checklist, value: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('checklists')
        .update({ [field]: value })
        .eq('fila_operador_id', id);
      
      if (error) throw error;
      
      setCurrentQueue(prev => prev.map(op => 
        op.id === id ? { ...op, checklist: { ...op.checklist!, [field]: value } } : op
      ));
    } catch (err: any) {
      console.error('Error updating checklist:', err);
    }
  };

  const updateLunch = async (id: string, horario: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('almocos')
        .update({ horario })
        .eq('fila_operador_id', id);
      
      if (error) throw error;
      
      setCurrentQueue(prev => prev.map(op => 
        op.id === id ? { ...op, almoco: { ...op.almoco!, horario } } : op
      ));
    } catch (err: any) {
      console.error('Error updating lunch:', err);
    }
  };

  const updateInfo = async (id: string, field: 'atendimento_tipo' | 'atendimento_hora' | 'atendimento_obs', value: string) => {
    if (!supabase) return;
    try {
      const op = currentQueue.find(o => o.id === id);
      const updates: any = { [field]: value };
      
      // Auto-fill time if empty and user is typing obs or changing type
      if ((field === 'atendimento_obs' || field === 'atendimento_tipo') && (!op?.atendimento_hora)) {
        updates.atendimento_hora = format(new Date(), 'HH:mm');
      }

      const { error } = await supabase
        .from('fila_operadores')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setCurrentQueue(prev => prev.map(o => 
        o.id === id ? { ...o, ...updates } : o
      ));
    } catch (err: any) {
      console.error('Error updating info:', err);
    }
  };

  const updateOperatorStatus = async (id: string, status: 'Ativo' | 'Ausente', ausenteAte?: string | null) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('operadores')
        .update({ status, ausente_ate: ausenteAte })
        .eq('id', id);
      
      if (error) throw error;
      fetchOperators();
    } catch (err: any) {
      console.error('Error updating operator status:', err);
    }
  };

  const updateOperatorSchedule = async (id: string, horario: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('operadores')
        .update({ horario_trabalho: horario })
        .eq('id', id);

      if (error) throw error;
      setOperators(prev => prev.map(op => op.id === id ? { ...op, horario_trabalho: horario } : op));
    } catch (err: any) {
      console.error('Error updating operator schedule:', err);
    }
  };

  const updateOperatorPosition = async (id: string, posicao: number | null) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('operadores')
        .update({ posicao_fixa: posicao })
        .eq('id', id);

      if (error) throw error;
      setOperators(prev => prev.map(op => op.id === id ? { ...op, posicao_fixa: posicao } : op));
    } catch (err: any) {
      console.error('Error updating operator position:', err);
    }
  };

  const updateQueueHandover = async (operadorId: string | null) => {
    if (!supabase || !currentQueueData) return;
    try {
      const { error } = await supabase
        .from('filas')
        .update({ responsavel_passagem_turno_id: operadorId })
        .eq('id', currentQueueData.id);
      
      if (error) throw error;
      setCurrentQueueData(prev => prev ? { ...prev, responsavel_passagem_turno_id: operadorId } : null);
    } catch (err: any) {
      console.error('Error updating handover:', err);
    }
  };

  const addOperatorToQueue = async (operadorId: string) => {
    if (!supabase || !currentQueueData) return;
    try {
      const filaId = currentQueueData.id;
      const nextOrder = currentQueue.length;

      const { data: newOp, error: insertError } = await supabase
        .from('fila_operadores')
        .insert([{ fila_id: filaId, operador_id: operadorId, ordem: nextOrder }])
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.from('checklists').insert([{ fila_operador_id: newOp.id }]);
      await supabase.from('almocos').insert([{ fila_operador_id: newOp.id }]);

      fetchCurrentQueue();
    } catch (err: any) {
      console.error('Error adding operator to queue:', err);
    }
  };

  const removeOperatorFromQueue = async (queueOperatorId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('fila_operadores')
        .delete()
        .eq('id', queueOperatorId);
      
      if (error) throw error;
      fetchCurrentQueue();
    } catch (err: any) {
      console.error('Error removing operator from queue:', err);
    }
  };

  const fetchHistory = async (date: string) => {
    if (!supabase) return;
    try {
      const { data: queueData } = await supabase
        .from('filas')
        .select('*')
        .eq('data', date)
        .single();

      if (queueData) {
        const { data: queueOps } = await supabase
          .from('fila_operadores')
          .select(`
            *,
            operador:operadores(*),
            checklist:checklists(*),
            almoco:almocos(*)
          `)
          .eq('fila_id', queueData.id)
          .order('ordem');

        setHistoryQueues(prev => ({ ...prev, [date]: queueOps || [] }));
      }
    } catch (err: any) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchSchedules = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('escalas_por_data')
        .select('*')
        .order('data', { ascending: true });
      
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('relation "escalas_por_data" does not exist')) {
          console.warn('Tabela escalas_por_data não encontrada.');
          setSchedules([]);
          return;
        }
        throw error;
      }
      setSchedules(data || []);
    } catch (err: any) {
      console.error('Error fetching schedules:', err);
    }
  }, []);

  const updateSchedule = async (tipo: 'terca' | 'quarta' | 'presencial', names: string, dateStr: string) => {
    if (!supabase) return;
    let isUpdate = false;
    let actionName = 'salvar';
    try {
      // Check if exists
      const { data: existing, error: fetchError } = await supabase
        .from('escalas_por_data')
        .select('id')
        .eq('data', dateStr)
        .eq('tipo', tipo)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing schedule:', fetchError);
        throw fetchError;
      }

      isUpdate = !!existing;
      actionName = isUpdate ? 'atualizar' : 'adicionar';
      
      let result;
      if (existing) {
        result = await supabase
          .from('escalas_por_data')
          .update({ nomes: names })
          .eq('id', existing.id)
          .select();
      } else {
        result = await supabase
          .from('escalas_por_data')
          .insert({ tipo, nomes: names, data: dateStr })
          .select();
      }
      
      if (result.error) throw result.error;
      const data = result.data?.[0];
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
      // Inspecionar o erro de forma mais profunda antes de logar
      const errorDetail = {
        message: err?.message || (typeof err === 'string' ? err : 'Erro desconhecido'),
        details: err?.details || null,
        hint: err?.hint || null,
        code: err?.code || null,
        status: err?.status || null,
        type: err?.name || 'Error'
      };

      if (errorDetail.message.includes('relation "escalas_por_data" does not exist') || errorDetail.code === '42P01') {
        errorDetail.message = 'A tabela "escalas_por_data" não existe no banco de dados. Por favor, execute as migrações SQL.';
      }

      console.error(`Error updating schedule [${actionName}]:`, errorDetail);
      console.error('Full error object:', err);

      // Feedback para o usuário
      const typeLabel = tipo === 'presencial' ? 'Presencial' : (tipo === 'terca' ? 'Terça' : 'Quarta');
      const userFriendlyMessage = `Erro ao ${actionName} "Escala: ${typeLabel}": ${errorDetail.message}`;
      
      // Se for erro de autenticação, podemos emitir um alerta ou log específico
      const isAuthError = err?.status === 401 || 
                         err?.code === '401' || 
                         err?.message?.includes('Invalid Refresh Token') || 
                         err?.message?.includes('JWT') ||
                         err?.message?.includes('session');

      if (isAuthError) {
        console.warn('Authentication error detected in updateSchedule');
        if (typeof window !== 'undefined') {
          alert('Sessão expirada. Por favor, faça login novamente.');
          localStorage.removeItem('systemsat-auth-token');
          window.location.reload();
        }
      } else {
        if (typeof window !== 'undefined') {
          alert(userFriendlyMessage);
        }
      }
    }
  };

  const deleteSchedule = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('escalas_por_data').delete().eq('id', id);
      if (error) throw error;
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      const errorMsg = err?.message || (typeof err === 'string' ? err : 'Erro desconhecido');
      console.error('Error deleting schedule:', {
        message: errorMsg,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        status: err?.status,
        fullError: err
      });
      
      const isAuthError = err?.status === 401 || 
                         err?.code === '401' || 
                         err?.message?.includes('Invalid Refresh Token') || 
                         err?.message?.includes('JWT');

      if (isAuthError) {
        if (typeof window !== 'undefined') {
          alert('Sessão expirada. Por favor, faça login novamente.');
          localStorage.removeItem('systemsat-auth-token');
          window.location.reload();
        }
      } else {
        if (typeof window !== 'undefined') {
          alert(`Erro ao excluir escala: ${errorMsg}`);
        }
      }
    }
  };

  const completeActivity = async (id: string) => {
    if (!supabase) return;
    try {
      const opToMove = currentQueue.find(op => op.id === id);
      if (!opToMove) return;

      const time = format(new Date(), 'HH:mm');
      const finalTime = opToMove.atendimento_hora || time;
      
      // 1. Save to activities history
      await supabase.from('atividades').insert([{
        operador_id: opToMove.operador_id,
        tipo: opToMove.atendimento_tipo || 'Chamado',
        horario: finalTime,
        observacao: opToMove.atendimento_obs || '',
        data: format(new Date(), 'yyyy-MM-dd')
      }]);

      // 2. Update the record (Reset fields for next turn)
      // Note: We keep checklist and lunch persistent as requested
      const { error: updateError } = await supabase
        .from('fila_operadores')
        .update({ 
          atendimento_hora: '',
          atendimento_obs: '',
          atendimento_tipo: 'Chamado' // Reset to default
        })
        .eq('id', id);

      if (updateError) throw updateError;

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

      const { error: reorderError } = await supabase.from('fila_operadores').upsert(updates);
      if (reorderError) throw reorderError;

      // 4. Refresh activities
      fetchActivities();
    } catch (err: any) {
      console.error('Error completing activity:', err);
    }
  };

  const deleteActivity = async (activityId: string) => {
    if (!supabase) return;
    try {
      const activityToDelete = activities.find(a => a.id === activityId);
      if (!activityToDelete) return;

      // 1. Delete the activity
      const { error: deleteError } = await supabase
        .from('atividades')
        .delete()
        .eq('id', activityId);

      if (deleteError) throw deleteError;

      // 2. Refresh activities list
      fetchActivities();

      // 3. Check if it was the LAST activity for this operator today
      const { data: lastActivity } = await supabase
        .from('atividades')
        .select('id')
        .eq('operador_id', activityToDelete.operador_id)
        .eq('data', format(new Date(), 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // If no more activities for today, or the deleted one was the most recent,
      // we might want to return them to the top of the queue.
      // Let's check if they are currently at the END of the queue.
      const opInQueue = currentQueue.find(op => op.operador_id === activityToDelete.operador_id);
      if (opInQueue && opInQueue.ordem === currentQueue.length - 1) {
        // Move to front: ordem 0
        const otherOps = currentQueue.filter(op => op.id !== opInQueue.id);
        const newOrder = [opInQueue, ...otherOps];
        
        const updates = newOrder.map((op, idx) => ({
          id: op.id,
          ordem: idx
        }));

        const { error: reorderError } = await supabase.from('fila_operadores').upsert(updates);
        if (reorderError) throw reorderError;
        
        setCurrentQueue(newOrder.map((op, idx) => ({ ...op, ordem: idx })));
      }
    } catch (err: any) {
      console.error('Error deleting activity:', err);
    }
  };

  const exportQueueReport = async (startDate: string, endDate: string) => {
    if (!supabase) return [];
    try {
      // Fetch all queues in range
      const { data: queues, error: queuesError } = await supabase
        .from('filas')
        .select('*')
        .gte('data', startDate)
        .lte('data', endDate);

      if (queuesError) throw queuesError;

      const reportData: any[] = [];

      for (const queue of queues) {
        // Fetch queue operators
        const { data: queueOps, error: opsError } = await supabase
          .from('fila_operadores')
          .select('*, operador:operadores(*), checklist:checklists(*), almoco:almocos(*)')
          .eq('fila_id', queue.id)
          .order('ordem');

        if (opsError) throw opsError;

        // Fetch activities for this specifically targeted date to be sure
        const { data: activityData, error: activitiesError } = await supabase
          .from('atividades')
          .select('*, operador:operadores(*)')
          .eq('data', queue.data)
          .order('created_at', { ascending: true });

        if (activitiesError) throw activitiesError;

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
    fetchOperators();
    fetchCurrentQueue();
    fetchSchedules();
  }, [fetchOperators, fetchCurrentQueue, fetchSchedules]);

  return (
    <QueueContext.Provider value={{
      operators,
      currentQueue,
      currentQueueData,
      historyQueues,
      availableDates,
      activities,
      schedules,
      isLoading,
      error,
      fetchOperators,
      fetchCurrentQueue,
      fetchActivities,
      fetchAvailableDates,
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
      removeOperatorFromQueue,
      fetchHistory,
      updateSchedule,
      deleteSchedule,
      completeActivity,
      deleteActivity,
      exportQueueReport
    }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
}