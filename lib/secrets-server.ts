/**
 * Este arquivo contém utilitários para gerenciar segredos no banco de dados. 
 * Só deve ser importado em Server Components ou API Routes.
 */
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from './encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!;

// Cliente administrativo que ignora RLS para gerenciar a tabela app_secrets
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

/**
 * Busca um segredo descriptografado do banco de dados ou das configurações simples.
 */
export async function getSecret(keyName: string): Promise<string | null> {
  try {
    // 0. Hardcoded values for simplicity (as requested by user)
    if (keyName === 'bitrix_webhook') {
      return 'https://systemsat.bitrix24.com.br/rest/54/y9yqvxtdwvccpsr1/';
    }

    // 1. Tentar buscar da tabela de configurações simples (Plain Text)
    const { data: simpleData, error: simpleError } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key_name', keyName)
      .single();

    if (!simpleError && simpleData) {
      return simpleData.value;
    }

    // 2. Tentar buscar da tabela de segredos (Criptografada) se existir
    const { data: secretData, error: secretError } = await supabaseAdmin
      .from('app_secrets')
      .select('encrypted_value, iv, tag')
      .eq('key_name', keyName)
      .single();

    if (!secretError && secretData) {
      try {
        return decrypt(secretData.encrypted_value, secretData.iv, secretData.tag);
      } catch (decryptErr) {
        console.warn(`Falha ao descriptografar ${keyName}, talvez a chave mudou.`);
      }
    }

    // 3. Fallback para variáveis de ambiente
    if (keyName === 'bitrix_webhook') return process.env.BITRIX_WEBHOOK || null;
    if (keyName === 'odoo_url') return process.env.ODOO_URL || null;
    
    return null;
  } catch (err) {
    console.error(`Erro ao buscar segredo ${keyName}:`, err);
    return null;
  }
}

/**
 * Salva um segredo (preferencialmente em texto plano para simplicidade conforme pedido do usuário).
 */
export async function setSecret(keyName: string, value: string, updatedBy?: string): Promise<boolean> {
  try {
    // Salvamos na tabela de configurações simples (Plain Text) para evitar dependência de ENCRYPTION_KEY
    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        key_name: keyName,
        value: value,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error(`Erro do Supabase ao salvar configuração ${keyName}:`, error);
      if (error.message.includes('schema cache') || error.code === 'PGRST204') {
        throw new Error('O banco de dados está sincronizando. Por favor, aguarde 30 segundos e tente novamente.');
      }
      throw new Error(`Erro no banco de dados: ${error.message}`);
    }
    return true;
  } catch (err: any) {
    console.error(`Erro ao salvar segredo ${keyName}:`, err);
    throw err;
  }
}