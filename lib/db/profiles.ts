import { query, queryOne } from '../db';

export interface DbProfile {
  id: string;
  email: string;
  role: string;
  status: string;
  permissions: Record<string, boolean>;
  dashboard_layout: any;
  queue_layout: any;
  settings_layout: any;
  updated_at: string;
}

export async function getProfileById(id: string): Promise<DbProfile | null> {
  return queryOne<DbProfile>(
    'SELECT id, email, role, status, permissions, dashboard_layout, queue_layout, settings_layout, updated_at FROM profiles WHERE id = $1',
    [id]
  );
}

export async function getProfileByEmail(email: string): Promise<DbProfile | null> {
  return queryOne<DbProfile>(
    'SELECT id, email, role, status, permissions, dashboard_layout, queue_layout, settings_layout, updated_at FROM profiles WHERE lower(email) = lower($1)',
    [email]
  );
}

export async function getProfileRole(id: string): Promise<string | null> {
  const row = await queryOne<{ role: string }>('SELECT role FROM profiles WHERE id = $1', [id]);
  return row?.role ?? null;
}

export async function listProfiles(): Promise<DbProfile[]> {
  return query<DbProfile>(
    'SELECT id, email, role, status, permissions, dashboard_layout, queue_layout, settings_layout, updated_at FROM profiles ORDER BY email'
  );
}

export async function upsertProfile(profile: {
  id: string;
  email: string;
  role: string;
  status?: string;
  permissions?: Record<string, boolean>;
}): Promise<DbProfile> {
  const row = await queryOne<DbProfile>(
    `INSERT INTO profiles (id, email, role, status, permissions, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       role = EXCLUDED.role,
       status = EXCLUDED.status,
       permissions = EXCLUDED.permissions,
       updated_at = now()
     RETURNING id, email, role, status, permissions, dashboard_layout, queue_layout, settings_layout, updated_at`,
    [profile.id, profile.email, profile.role, profile.status ?? 'active', JSON.stringify(profile.permissions ?? {})]
  );
  return row!;
}

export async function updateProfilePermissionsByEmail(
  email: string,
  permissions: Record<string, boolean>
): Promise<DbProfile | null> {
  return queryOne<DbProfile>(
    `UPDATE profiles SET permissions = $2, updated_at = now() WHERE lower(email) = lower($1)
     RETURNING id, email, role, status, permissions, dashboard_layout, queue_layout, settings_layout, updated_at`,
    [email, JSON.stringify(permissions)]
  );
}

export async function deleteProfileByEmail(email: string): Promise<void> {
  await query('DELETE FROM profiles WHERE lower(email) = lower($1)', [email]);
}

export async function updateProfileLayout(
  userId: string,
  field: 'dashboard_layout' | 'queue_layout' | 'settings_layout',
  value: any
): Promise<void> {
  await query(`UPDATE profiles SET ${field} = $2, updated_at = now() WHERE id = $1`, [userId, JSON.stringify(value)]);
}
