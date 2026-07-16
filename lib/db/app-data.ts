import { query, queryOne, newId } from '../db';

// pg serializes plain JS arrays as Postgres array literals, not JSON - jsonb
// columns need the value pre-stringified so it lands as JSON text instead.
const JSONB_COLUMNS = new Set(['raw_data', 'avatar_options', 'badges', 'goals']);

function toJsonbParam(col: string, value: any) {
  if (value === undefined || value === null) return null;
  return JSONB_COLUMNS.has(col) ? JSON.stringify(value) : value;
}

// --- uploads ---

export async function listUploads() {
  return query('SELECT * FROM uploads ORDER BY created_at DESC');
}

export async function insertUpload(fields: { filename: string; row_count: number; source?: string }) {
  const id = newId();
  const row = await queryOne(
    `INSERT INTO uploads (id, filename, row_count, source, created_at) VALUES ($1, $2, $3, $4, now()) RETURNING *`,
    [id, fields.filename, fields.row_count, fields.source ?? null]
  );
  return row!;
}

export async function deleteUpload(id: string) {
  await query('DELETE FROM uploads WHERE id = $1', [id]);
}

export async function deleteAllUploads() {
  await query('DELETE FROM uploads');
}

// --- support_data ---

export async function listSupportData(source?: string) {
  if (source) {
    return query('SELECT * FROM support_data WHERE source = $1 ORDER BY data DESC LIMIT 50000', [source]);
  }
  return query('SELECT * FROM support_data LIMIT 50000');
}

export async function upsertSupportData(rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const values: any[] = [];
  const tuples = rows.map((row, i) => {
    const placeholders = cols.map((_, j) => `$${i * cols.length + j + 1}`);
    cols.forEach(c => values.push(toJsonbParam(c, row[c])));
    return `(${placeholders.join(', ')})`;
  });
  await query(
    `INSERT INTO support_data (${cols.join(', ')}) VALUES ${tuples.join(', ')} ON CONFLICT (id) DO NOTHING`,
    values
  );
}

export async function deleteSupportDataByUploadId(uploadId: string) {
  await query('DELETE FROM support_data WHERE upload_id = $1', [uploadId]);
}

export async function deleteSupportDataByColaborador(name: string) {
  await query('DELETE FROM support_data WHERE colaborador = $1', [name]);
}

export async function deleteSupportDataBySource(source: string) {
  await query('DELETE FROM support_data WHERE source = $1', [source]);
}

export async function deleteAllSupportData() {
  await query('DELETE FROM support_data');
}

export async function updateSupportDataExclusion(id: string, isExcluded: boolean, reason?: string | null) {
  await query('UPDATE support_data SET is_excluded = $2, exclusion_reason = $3 WHERE id = $1', [id, isExcluded, reason ?? null]);
}

export async function updateSupportDataNote(id: string, note: string) {
  await query('UPDATE support_data SET notes = $2 WHERE id = $1', [id, note]);
}

// --- collaborator_settings ---

export async function listCollaboratorSettings() {
  return query('SELECT * FROM collaborator_settings');
}

export async function upsertCollaboratorSetting(fields: {
  name: string;
  avatar_url?: string;
  avatar_options?: any;
  badges?: string[];
  goals?: any[];
}) {
  const cols = Object.keys(fields).filter(k => k !== 'name');
  const setClause = cols.map(c => `${c} = EXCLUDED.${c}`).join(', ') || 'name = EXCLUDED.name';
  const allCols = ['name', ...cols];
  const values = allCols.map(c => toJsonbParam(c, (fields as any)[c]));
  const placeholders = allCols.map((_, i) => `$${i + 1}`);
  await query(
    `INSERT INTO collaborator_settings (${allCols.join(', ')}) VALUES (${placeholders.join(', ')})
     ON CONFLICT (name) DO UPDATE SET ${setClause}`,
    values
  );
}

export async function deleteCollaboratorSetting(name: string) {
  await query('DELETE FROM collaborator_settings WHERE name = $1', [name]);
}

// --- bitrix_tickets ---

export async function listBitrixTickets() {
  try {
    return await query('SELECT * FROM bitrix_tickets ORDER BY created_at DESC');
  } catch (err: any) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

export async function upsertBitrixTickets(rows: Record<string, any>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const values: any[] = [];
  const tuples = rows.map((row, i) => {
    const placeholders = cols.map((_, j) => `$${i * cols.length + j + 1}`);
    cols.forEach(c => values.push(row[c] ?? null));
    return `(${placeholders.join(', ')})`;
  });
  const setClause = cols.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ');
  await query(
    `INSERT INTO bitrix_tickets (${cols.join(', ')}) VALUES ${tuples.join(', ')}
     ON CONFLICT (id) DO UPDATE SET ${setClause}`,
    values
  );
}

export interface BitrixTicketFilters {
  search?: string;
  status?: string;
  assignee?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export async function listBitrixTicketsFiltered(filters: BitrixTicketFilters) {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const i = params.length;
    conditions.push(`(title ILIKE $${i} OR id ILIKE $${i} OR client ILIKE $${i})`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.assignee) {
    params.push(`%${filters.assignee}%`);
    conditions.push(`assignee ILIKE $${params.length}`);
  }
  if (filters.startDate) {
    params.push(filters.startDate);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (filters.endDate) {
    params.push(filters.endDate);
    conditions.push(`created_at <= $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = await queryOne<{ count: string }>(`SELECT COUNT(*) FROM bitrix_tickets ${where}`, params);
  const count = Number(countRow?.count ?? 0);

  const offset = (filters.page - 1) * filters.limit;
  const dataParams = [...params, filters.limit, offset];
  const data = await query(
    `SELECT * FROM bitrix_tickets ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    dataParams
  );

  return { data, count };
}

// --- bitrix_schedules ---

export async function listBitrixSchedules() {
  try {
    return await query('SELECT * FROM bitrix_schedules');
  } catch (err: any) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

export async function upsertBitrixSchedule(fields: {
  user_id: string;
  user_name?: string;
  schedule?: any;
  action?: string;
  active?: boolean;
}) {
  await query(
    `INSERT INTO bitrix_schedules (user_id, user_name, schedule, action, active, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       user_name = EXCLUDED.user_name, schedule = EXCLUDED.schedule,
       action = EXCLUDED.action, active = EXCLUDED.active, updated_at = now()`,
    [fields.user_id, fields.user_name ?? null, JSON.stringify(fields.schedule ?? {}), fields.action ?? 'pause', fields.active ?? true]
  );
}

export async function deleteBitrixSchedule(userId: string) {
  await query('DELETE FROM bitrix_schedules WHERE user_id = $1', [userId]);
}

// --- dashboard_layouts ---

export async function listDashboardLayouts(userId: string) {
  try {
    return await query('SELECT * FROM dashboard_layouts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  } catch (err: any) {
    if (err.code === '42P01') return [];
    throw err;
  }
}

export async function unsetDefaultLayouts(userId: string) {
  await query('UPDATE dashboard_layouts SET is_default = false WHERE user_id = $1', [userId]);
}

export async function upsertDashboardLayout(fields: { user_id: string; name: string; layout: any; is_default: boolean }) {
  const row = await queryOne(
    `INSERT INTO dashboard_layouts (id, user_id, name, layout, is_default, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, now(), now())
     ON CONFLICT (user_id, name) DO UPDATE SET
       layout = EXCLUDED.layout, is_default = EXCLUDED.is_default, updated_at = now()
     RETURNING *`,
    [newId(), fields.user_id, fields.name, JSON.stringify(fields.layout), fields.is_default]
  );
  return row!;
}

export async function updateDashboardLayoutById(id: string, userId: string, layout: any) {
  await query('UPDATE dashboard_layouts SET layout = $3, updated_at = now() WHERE id = $1 AND user_id = $2', [
    id,
    userId,
    JSON.stringify(layout),
  ]);
}

export async function deleteDashboardLayout(id: string, userId: string) {
  await query('DELETE FROM dashboard_layouts WHERE id = $1 AND user_id = $2', [id, userId]);
}
