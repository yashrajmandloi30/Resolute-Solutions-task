/**
 * LAYER 1 — Frontend encryption (AES-256-CBC via crypto-js)
 *
 * Every profile field is encrypted here BEFORE it leaves the browser.
 * The backend never sees these values in plain text: it adds its own
 * second layer before saving, and strips only that layer when reading.
 * The final decryption happens here, in the browser.
 *
 * Output format:  base64(iv):base64(ciphertext)
 */
import CryptoJS from 'crypto-js';

const SECRET = import.meta.env.VITE_CLIENT_ENC_KEY;
if (!SECRET) {
  throw new Error('VITE_CLIENT_ENC_KEY is missing. Copy client/.env.example to client/.env');
}

// Derive a fixed 256-bit key from the secret
const KEY = CryptoJS.SHA256(SECRET);

export function clientEncrypt(plainText: string): string {
  const iv = CryptoJS.lib.WordArray.random(16); // fresh IV every time
  const encrypted = CryptoJS.AES.encrypt(plainText, KEY, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return `${CryptoJS.enc.Base64.stringify(iv)}:${encrypted.ciphertext.toString(CryptoJS.enc.Base64)}`;
}

export function clientDecrypt(payload: string): string {
  const [ivB64, cipherB64] = payload.split(':');
  if (!ivB64 || !cipherB64) throw new Error('Invalid encrypted value');

  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(cipherB64) }),
    KEY,
    { iv: CryptoJS.enc.Base64.parse(ivB64), mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );

  const text = decrypted.toString(CryptoJS.enc.Utf8);
  if (!text) throw new Error('Decryption failed (wrong key?)');
  return text;
}

/**
 * Deterministic SHA-256 of the normalised email.
 * Lets the server find a student by email / keep emails unique
 * without ever receiving the email in plain text.
 */
export function hashEmail(email: string): string {
  return CryptoJS.SHA256(email.trim().toLowerCase()).toString(CryptoJS.enc.Hex);
}
