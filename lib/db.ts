import { Pool, types } from 'pg';
import crypto from 'crypto';

// pg's default DATE parser returns a JS Date (midnight UTC), which then
// serializes to a full ISO datetime in JSON responses. PostgREST/Supabase
// used to return plain "YYYY-MM-DD" strings for `date` columns, and client
// code (date-fns parseISO, string concatenation, etc.) still expects that
// shape - so keep DATE columns as raw strings instead of parsing them.
types.setTypeParser(types.builtins.DATE, (val: string) => val);

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

// pg emits 'error' on the pool whenever an idle client hits a network issue
// (e.g. the DB connection dropping). Without a listener, that event is an
// uncaught exception and takes down the whole Node process - killing every
// in-flight request with a bare 500 "Internal Server Error", not just the
// one that touched the bad connection.
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
