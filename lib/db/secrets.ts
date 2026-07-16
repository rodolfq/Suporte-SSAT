import { query, queryOne } from '../db';
import { decrypt } from '../encryption';

export async function getSecret(keyName: string): Promise<string | null> {
  try {
    // 0. Hardcoded values for simplicity (as requested by user)
    if (keyName === 'bitrix_webhook') {
      return 'https://systemsat.bitrix24.com.br/rest/54/y9yqvxtdwvccpsr1/';
    }

    // 1. Tentar buscar da tabela de configurações simples (Plain Text)
    const simple = await queryOne<{ value: string }>('SELECT value FROM app_settings WHERE key_name = $1', [keyName]);
    if (simple) return simple.value;

    // 2. Tentar buscar da tabela de segredos (Criptografada) se existir
    const secret = await queryOne<{ encrypted_value: string; iv: string; tag: string }>(
      'SELECT encrypted_value, iv, tag FROM app_secrets WHERE key_name = $1',
      [keyName]
    );
    if (secret) {
      try {
        return decrypt(secret.encrypted_value, secret.iv, secret.tag);
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

export async function setSecret(keyName: string, value: string): Promise<boolean> {
  try {
    // Salvamos na tabela de configurações simples (Plain Text) para evitar dependência de ENCRYPTION_KEY
    await query(
      `INSERT INTO app_settings (key_name, value, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (key_name) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [keyName, value]
    );
    return true;
  } catch (err: any) {
    console.error(`Erro ao salvar segredo ${keyName}:`, err);
    throw err;
  }
}
