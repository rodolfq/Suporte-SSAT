-- CORREÇÃO DEFINITIVA: LISTA FIXA DE COLABORADORES E SINCRONIZAÇÃO COM HORÁRIOS (Timestamp: 20260518112000)

-- 1. Limpar Operadores Genéricos e Antigos
-- O CASCADE garante que fila_operadores, checklists, etc, sejam limpos
TRUNCATE public.operadores RESTART IDENTITY CASCADE;

-- 2. Inserir Lista Fixa nos Operadores
INSERT INTO public.operadores (nome, status, ignorar_na_fila, horario_trabalho) VALUES
('Rodolfo', 'Ativo', false, '08:00 - 17:00'),
('Mauro', 'Ativo', false, '08:00 - 17:00'),
('Ana Julia', 'Ativo', false, '08:00 - 17:00'),
('Davidson', 'Ativo', false, '08:00 - 17:00'),
('Thiago', 'Ativo', false, '08:00 - 17:00'),
('Rafael', 'Ativo', false, '08:00 - 17:00'),
('Bianca', 'Ativo', false, '08:00 - 17:00'),
('Pablo', 'Ativo', false, '08:00 - 17:00');

-- 3. Sincronizar com bitrix_schedules para que apareçam no campo "Horários"
-- Isso permite definir quem vai trabalhar (escala) via UI que consome bitrix_schedules
INSERT INTO public.bitrix_schedules (user_id, user_name, schedule, action, active)
SELECT 
    MD5(nome), -- ID fake para compatibilidade
    nome, 
    '{"id": null, "TYPE": "SHIFT", "WORKTIME_START": "08:00:00", "WORKTIME_END": "17:00:00"}'::jsonb,
    'pause',
    true
FROM public.operadores
ON CONFLICT (user_id) DO UPDATE SET user_name = EXCLUDED.user_name;

-- 4. Remover qualquer resquício de "Operador 1" ou "Operador 2" de bitrix_schedules se houver
DELETE FROM public.bitrix_schedules WHERE user_name ILIKE 'Operador %';

-- 5. Garantir que as tabelas de fila estão prontas para receber esses novos IDs
ALTER TABLE public.fila_operadores DROP CONSTRAINT IF EXISTS fila_operadores_operador_id_fkey;
ALTER TABLE public.fila_operadores ADD CONSTRAINT fila_operadores_operador_id_fkey 
    FOREIGN KEY (operador_id) REFERENCES public.operadores(id) ON DELETE CASCADE;

-- 6. Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';