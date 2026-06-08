
import { supabase } from './lib/supabase';

async function checkData() {
  if (!supabase) {
    console.log('Supabase not configured');
    return;
  }

  const { count: docCount, error: docError } = await supabase
    .from('kb_documents')
    .select('*', { count: 'exact', head: true });

  const { count: chunkCount, error: chunkError } = await supabase
    .from('kb_chunks')
    .select('*', { count: 'exact', head: true });

  console.log('Documents:', docCount, docError);
  console.log('Chunks:', chunkCount, chunkError);

  if (chunkCount && chunkCount > 0) {
    const { data: firstChunk } = await supabase
      .from('kb_chunks')
      .select('embedding')
      .limit(1)
      .single();
    if (firstChunk?.embedding) {
      console.log('Existing embedding dimension:', firstChunk.embedding.length);
    }
  }
}

checkData();