/**
 * LAYER 2 — Server-side encryption (AES-256-GCM, Node built-in crypto)
 *
 * The frontend has already encrypted every field once (Layer 1).
 * Here we wrap that ciphertext in a second AES-256-GCM layer before it
 * touches MongoDB. On read we remove ONLY this layer, so the API response
 * still contains Layer-1 ciphertext that only the frontend can open.
 *
 * Stored format:  base64(iv).base64(authTag).base64(ciphertext)
 */
import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM

// Derive fixed-length 32-byte keys from the env secret.
// Separate keys for encryption and for the searchable email index.
const ENC_KEY = crypto.createHash('sha256').update(`enc:${env.serverEncKey}`).digest();
const INDEX_KEY = crypto.createHash('sha256').update(`idx:${env.serverEncKey}`).digest();

export function serverEncrypt(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((b) => b.toString('base64')).join('.');
}

export function serverDecrypt(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid server-encrypted payload');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, ENC_KEY, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64')); // tamper detection

  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Blind index: deterministic HMAC so we can look up / enforce uniqueness
 * on email without ever storing (or even receiving) the plain email.
 */
export function blindIndex(value: string): string {
  return crypto.createHmac('sha256', INDEX_KEY).update(value).digest('hex');
}
