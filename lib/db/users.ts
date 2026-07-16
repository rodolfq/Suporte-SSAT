import { query, queryOne, newId } from '../db';

export interface DbUser {
  id: string;
  email: string;
  encrypted_password: string | null;
  banned_until: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
}

export async function getUserById(id: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
}

export async function createUser(email: string, passwordHash: string): Promise<DbUser> {
  const id = newId();
  const row = await queryOne<DbUser>(
    `INSERT INTO users (id, email, encrypted_password, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now()) RETURNING *`,
    [id, email.toLowerCase().trim(), passwordHash]
  );
  return row!;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  await query('UPDATE users SET encrypted_password = $1, updated_at = now() WHERE id = $2', [passwordHash, id]);
}

export async function listUsers(): Promise<DbUser[]> {
  return query<DbUser>('SELECT * FROM users ORDER BY email');
}
