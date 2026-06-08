import crypto from 'crypto';

/**
 * Utilitário de criptografia AES-256-GCM para proteger chaves sensíveis no banco de dados.
 * Requer a variável de ambiente ENCRYPTION_KEY (32 bytes em hex).
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_HEX = process.env.ENCRYPTION_KEY || '';

// Validação da chave no carregamento do módulo
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production' && KEY_HEX.length !== 64) {
  console.warn('⚠️ CONFIG_ERROR: ENCRYPTION_KEY ausente ou inválida. As integrações de API (Bitrix/Odoo) não funcionarão corretamente até que você defina ENCRYPTION_KEY nas configurações do AI Studio.');
}

const key = Buffer.from(KEY_HEX, 'hex');

export interface EncryptedData {
  encryptedValue: string;
  iv: string;
  tag: string;
}

/**
 * Criptografa um texto puro
 */
export function encrypt(text: string): EncryptedData {
  if (!text) throw new Error('Texto para criptografia não pode estar vazio');
  
  if (!process.env.ENCRYPTION_KEY || key.length !== 32) {
    throw new Error('CONFIG_ERROR: A variável de ambiente ENCRYPTION_KEY não foi configurada ou é inválida (deve ter 64 caracteres hexadecimais). Verifique as configurações do projeto.');
  }

  const iv = crypto.randomBytes(12); // GCM recomenda 12 bytes de IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encryptedValue: encrypted,
    iv: iv.toString('hex'),
    tag: tag
  };
}

/**
 * Descriptografa um valor
 */
export function decrypt(encryptedValue: string, ivHex: string, tagHex: string): string {
  if (!encryptedValue || !ivHex || !tagHex) throw new Error('Parâmetros de descriptografia incompletos');
  
  if (!process.env.ENCRYPTION_KEY || key.length !== 32) {
    throw new Error('CONFIG_ERROR: A variável de ambiente ENCRYPTION_KEY não foi configurada ou é inválida (deve ter 64 caracteres hexadecimais).');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}