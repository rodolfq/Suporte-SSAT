import { query, queryOne, newId } from '../db';

export async function listDocuments() {
  return query('SELECT * FROM kb_documents ORDER BY created_at DESC');
}

export async function insertDocument(title: string, fileType: string) {
  const row = await queryOne(
    `INSERT INTO kb_documents (id, title, file_type, created_at) VALUES ($1, $2, $3, now()) RETURNING *`,
    [newId(), title, fileType]
  );
  return row!;
}

export async function deleteDocument(id: string) {
  await query('DELETE FROM kb_documents WHERE id = $1', [id]);
}

export async function countChunks(): Promise<number> {
  const row = await queryOne<{ count: string }>('SELECT COUNT(*) FROM kb_chunks');
  return Number(row?.count ?? 0);
}

export async function insertChunk(documentId: string | null, content: string, embedding: number[]) {
  await query(
    `INSERT INTO kb_chunks (id, document_id, content, embedding, created_at) VALUES ($1, $2, $3, $4, now())`,
    [newId(), documentId, content, embedding]
  );
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Replaces the pgvector `match_kb_chunks` RPC: no pgvector extension available
// on the target server, so similarity is computed in application code instead.
// Fine at this corpus size (a handful of chunks).
export async function matchKbChunks(queryEmbedding: number[], matchThreshold: number, matchCount: number) {
  const rows = await query<{ id: string; document_id: string; content: string; embedding: number[] }>(
    'SELECT id, document_id, content, embedding FROM kb_chunks WHERE embedding IS NOT NULL'
  );
  return rows
    .map(r => ({ id: r.id, document_id: r.document_id, content: r.content, similarity: cosineSimilarity(r.embedding, queryEmbedding) }))
    .filter(r => r.similarity > matchThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount);
}

export async function listNotes() {
  return query('SELECT * FROM kb_notes ORDER BY created_at DESC');
}

export async function insertNote(content: string) {
  const row = await queryOne(
    `INSERT INTO kb_notes (id, content, created_at) VALUES ($1, $2, now()) RETURNING *`,
    [newId(), content]
  );
  return row!;
}

export async function deleteNote(id: string) {
  await query('DELETE FROM kb_notes WHERE id = $1', [id]);
}

export async function listAiUsageToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return query<{ total_tokens: number }>('SELECT total_tokens FROM ai_usage_logs WHERE created_at >= $1', [today.toISOString()]);
}

export async function insertAiUsageLog(actionType: string, modelName: string, totalTokens: number) {
  await query(
    `INSERT INTO ai_usage_logs (id, action_type, model_name, total_tokens, created_at) VALUES ($1, $2, $3, $4, now())`,
    [newId(), actionType, modelName, Math.round(totalTokens)]
  );
}
