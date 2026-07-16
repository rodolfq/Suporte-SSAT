import { query, queryOne, newId } from '../db';

const OPERADOR_COLS = `
  o.id AS op_id, o.nome AS op_nome, o.horario_trabalho AS op_horario_trabalho, o.status AS op_status,
  o.ausente_ate AS op_ausente_ate, o.ignorar_na_fila AS op_ignorar_na_fila, o.posicao_fixa AS op_posicao_fixa,
  o.created_at AS op_created_at
`;

function mapOperador(row: any) {
  if (!row.op_id) return undefined;
  return {
    id: row.op_id,
    nome: row.op_nome,
    horario_trabalho: row.op_horario_trabalho,
    status: row.op_status,
    ausente_ate: row.op_ausente_ate,
    ignorar_na_fila: row.op_ignorar_na_fila,
    posicao_fixa: row.op_posicao_fixa,
    created_at: row.op_created_at,
  };
}

// --- operadores ---

export async function listOperators() {
  return query(
    `SELECT * FROM operadores ORDER BY posicao_fixa IS NULL, posicao_fixa ASC, nome ASC`
  );
}

export async function listActiveOperators() {
  return query(`SELECT * FROM operadores WHERE ignorar_na_fila = false`);
}

const OPERATOR_UPDATABLE_FIELDS = ['status', 'ausente_ate', 'horario_trabalho', 'posicao_fixa'];

export async function updateOperator(
  id: string,
  fields: Partial<{ status: string; ausente_ate: string | null; horario_trabalho: string; posicao_fixa: number | null }>
) {
  const keys = Object.keys(fields).filter(k => OPERATOR_UPDATABLE_FIELDS.includes(k));
  if (keys.length === 0) return;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  await query(`UPDATE operadores SET ${sets} WHERE id = $1`, [id, ...keys.map(k => (fields as any)[k])]);
}

// --- filas ---

export async function listFilaDates(): Promise<string[]> {
  const rows = await query<{ data: string }>('SELECT DISTINCT data FROM filas ORDER BY data DESC');
  return rows.map(r => r.data);
}

export async function getFilaByDate(date: string) {
  return queryOne('SELECT * FROM filas WHERE data = $1', [date]);
}

export async function listFilasInRange(start: string, end: string) {
  return query('SELECT * FROM filas WHERE data >= $1 AND data <= $2', [start, end]);
}

export async function createFila(data: string, responsavelId: string | null) {
  const id = newId();
  const row = await queryOne(
    `INSERT INTO filas (id, data, responsavel_passagem_turno_id, created_at) VALUES ($1, $2, $3, now()) RETURNING *`,
    [id, data, responsavelId]
  );
  return row!;
}

export async function updateFilaHandover(id: string, responsavelId: string | null) {
  await query('UPDATE filas SET responsavel_passagem_turno_id = $2 WHERE id = $1', [id, responsavelId]);
}

// --- fila_operadores ---

export async function listFilaOperadoresPlain(filaId: string) {
  return query<{ id: string; operador_id: string; ordem: number }>(
    'SELECT id, operador_id, ordem FROM fila_operadores WHERE fila_id = $1 ORDER BY ordem',
    [filaId]
  );
}

export async function listFilaOperadoresFull(filaId: string) {
  const rows = await query<any>(
    `SELECT fo.id, fo.fila_id, fo.operador_id, fo.ordem, fo.ticket_info, fo.telefone_info,
            fo.atendimento_tipo, fo.atendimento_hora, fo.atendimento_obs, fo.created_at,
            ${OPERADOR_COLS},
            c.id AS ch_id, c.vpn AS ch_vpn, c.ch_bitrix AS ch_ch_bitrix, c.ch_odoo AS ch_ch_odoo,
            c.telefone AS ch_telefone, c.almoco AS ch_almoco,
            al.id AS al_id, al.horario AS al_horario
     FROM fila_operadores fo
     LEFT JOIN operadores o ON o.id = fo.operador_id
     LEFT JOIN checklists c ON c.fila_operador_id = fo.id
     LEFT JOIN almocos al ON al.fila_operador_id = fo.id
     WHERE fo.fila_id = $1
     ORDER BY fo.ordem`,
    [filaId]
  );
  return rows.map(row => ({
    id: row.id,
    fila_id: row.fila_id,
    operador_id: row.operador_id,
    ordem: row.ordem,
    ticket_info: row.ticket_info,
    telefone_info: row.telefone_info,
    atendimento_tipo: row.atendimento_tipo,
    atendimento_hora: row.atendimento_hora,
    atendimento_obs: row.atendimento_obs,
    created_at: row.created_at,
    operador: mapOperador(row),
    checklist: row.ch_id
      ? { id: row.ch_id, fila_operador_id: row.id, vpn: row.ch_vpn, ch_bitrix: row.ch_ch_bitrix, ch_odoo: row.ch_ch_odoo, telefone: row.ch_telefone, almoco: row.ch_almoco }
      : undefined,
    almoco: row.al_id ? { id: row.al_id, fila_operador_id: row.id, horario: row.al_horario } : undefined,
  }));
}

export async function insertFilaOperador(filaId: string, operadorId: string, ordem: number) {
  const id = newId();
  const row = await queryOne(
    `INSERT INTO fila_operadores (id, fila_id, operador_id, ordem, created_at) VALUES ($1, $2, $3, $4, now()) RETURNING *`,
    [id, filaId, operadorId, ordem]
  );
  return row!;
}

export interface FilaOperadorUpsertRow {
  id?: string;
  fila_id: string;
  operador_id: string;
  ordem: number;
  atendimento_tipo?: string;
  ticket_info?: string;
  telefone_info?: string;
  atendimento_hora?: string;
  atendimento_obs?: string;
}

export async function upsertFilaOperadores(rows: FilaOperadorUpsertRow[]) {
  const results = [];
  for (const row of rows) {
    const id = row.id ?? newId();
    const result = await queryOne(
      `INSERT INTO fila_operadores (id, fila_id, operador_id, ordem, atendimento_tipo, ticket_info, telefone_info, atendimento_hora, atendimento_obs, created_at)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'Chamado'), COALESCE($6, ''), COALESCE($7, ''), COALESCE($8, ''), COALESCE($9, ''), now())
       ON CONFLICT (id) DO UPDATE SET
         fila_id = EXCLUDED.fila_id,
         operador_id = EXCLUDED.operador_id,
         ordem = EXCLUDED.ordem,
         atendimento_tipo = COALESCE($5, fila_operadores.atendimento_tipo),
         ticket_info = COALESCE($6, fila_operadores.ticket_info),
         telefone_info = COALESCE($7, fila_operadores.telefone_info),
         atendimento_hora = COALESCE($8, fila_operadores.atendimento_hora),
         atendimento_obs = COALESCE($9, fila_operadores.atendimento_obs)
       RETURNING *`,
      [id, row.fila_id, row.operador_id, row.ordem, row.atendimento_tipo ?? null, row.ticket_info ?? null, row.telefone_info ?? null, row.atendimento_hora ?? null, row.atendimento_obs ?? null]
    );
    results.push(result);
  }
  return results;
}

export async function deleteFilaOperadoresByIds(ids: string[]) {
  if (ids.length === 0) return;
  await query('DELETE FROM fila_operadores WHERE id = ANY($1::uuid[])', [ids]);
}

const FILA_OPERADOR_UPDATABLE_FIELDS = ['atendimento_tipo', 'atendimento_hora', 'atendimento_obs', 'ticket_info', 'telefone_info', 'ordem'];

export async function updateFilaOperador(id: string, fields: Record<string, any>) {
  const keys = Object.keys(fields).filter(k => FILA_OPERADOR_UPDATABLE_FIELDS.includes(k));
  if (keys.length === 0) return;
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  await query(`UPDATE fila_operadores SET ${sets} WHERE id = $1`, [id, ...keys.map(k => fields[k])]);
}

// --- checklists / almocos ---

export async function listChecklistFilaOperadorIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await query<{ fila_operador_id: string }>(
    'SELECT fila_operador_id FROM checklists WHERE fila_operador_id = ANY($1::uuid[])',
    [ids]
  );
  return new Set(rows.map(r => r.fila_operador_id));
}

export async function insertChecklists(filaOperadorIds: string[]) {
  for (const id of filaOperadorIds) {
    await query(`INSERT INTO checklists (id, fila_operador_id, created_at) VALUES ($1, $2, now())`, [newId(), id]);
  }
}

const CHECKLIST_FIELDS = ['vpn', 'ch_bitrix', 'ch_odoo', 'telefone', 'almoco'];

export async function updateChecklistField(filaOperadorId: string, field: string, value: boolean) {
  if (!CHECKLIST_FIELDS.includes(field)) throw new Error(`Invalid checklist field: ${field}`);
  await query(`UPDATE checklists SET ${field} = $2 WHERE fila_operador_id = $1`, [filaOperadorId, value]);
}

export async function listAlmocoFilaOperadorIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await query<{ fila_operador_id: string }>(
    'SELECT fila_operador_id FROM almocos WHERE fila_operador_id = ANY($1::uuid[])',
    [ids]
  );
  return new Set(rows.map(r => r.fila_operador_id));
}

export async function insertAlmocos(filaOperadorIds: string[]) {
  for (const id of filaOperadorIds) {
    await query(`INSERT INTO almocos (id, fila_operador_id, created_at) VALUES ($1, $2, now())`, [newId(), id]);
  }
}

export async function updateAlmocoHorario(filaOperadorId: string, horario: string) {
  await query('UPDATE almocos SET horario = $2 WHERE fila_operador_id = $1', [filaOperadorId, horario]);
}

// --- atividades ---

export async function listAtividades(date: string) {
  const rows = await query<any>(
    `SELECT a.id, a.operador_id, a.tipo, a.horario, a.observacao, a.data, a.created_at, ${OPERADOR_COLS}
     FROM atividades a
     LEFT JOIN operadores o ON o.id = a.operador_id
     WHERE a.data = $1
     ORDER BY a.created_at DESC`,
    [date]
  );
  return rows.map(row => ({
    id: row.id,
    operador_id: row.operador_id,
    tipo: row.tipo,
    horario: row.horario,
    observacao: row.observacao,
    data: row.data,
    created_at: row.created_at,
    operador: mapOperador(row),
  }));
}

export async function insertAtividade(fields: {
  operador_id: string;
  tipo: string;
  horario: string;
  observacao: string;
  data: string;
}) {
  const id = newId();
  await query(
    `INSERT INTO atividades (id, operador_id, tipo, horario, observacao, data, created_at) VALUES ($1, $2, $3, $4, $5, $6, now())`,
    [id, fields.operador_id, fields.tipo, fields.horario, fields.observacao, fields.data]
  );
}

export async function deleteAtividade(id: string) {
  await query('DELETE FROM atividades WHERE id = $1', [id]);
}

// --- escalas_por_data ---

export async function listEscalas() {
  return query('SELECT * FROM escalas_por_data ORDER BY data ASC');
}

export async function upsertEscala(tipo: string, nomes: string, data: string) {
  const row = await queryOne(
    `INSERT INTO escalas_por_data (id, data, tipo, nomes, created_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (data, tipo) DO UPDATE SET nomes = EXCLUDED.nomes
     RETURNING *`,
    [newId(), data, tipo, nomes]
  );
  return row!;
}

export async function deleteEscala(id: string) {
  await query('DELETE FROM escalas_por_data WHERE id = $1', [id]);
}
