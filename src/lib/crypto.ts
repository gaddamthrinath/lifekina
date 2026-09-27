/**
 * Web Crypto API AES-GCM (256-bit) encryption helper for Zero-Knowledge Signaling
 */

// Helper to convert Uint8Array to base64url
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Helper to convert base64url to Uint8Array
function base64ToBuffer(base64: string): Uint8Array {
  let str = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates an ephemeral 256-bit AES-GCM key
 */
export async function generateSyncSecretKey(): Promise<{ key: CryptoKey; keyString: string }> {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await window.crypto.subtle.exportKey('raw', key);
  const keyString = bufferToBase64(exported);
  return { key, keyString };
}

/**
 * Imports a 256-bit AES-GCM key from base64 string
 */
export async function importSyncSecretKey(keyString: string): Promise<CryptoKey> {
  const rawBytes = base64ToBuffer(keyString);
  return window.crypto.subtle.importKey(
    'raw',
    rawBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string message with AES-GCM 256-bit key
 */
export async function encryptPayload(plaintext: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encodedData = enc.encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encodedData.buffer as ArrayBuffer
  );

  const payload = {
    iv: bufferToBase64(iv),
    ct: bufferToBase64(ciphertext),
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts a string message with AES-GCM 256-bit key
 */
export async function decryptPayload(encryptedStr: string, key: CryptoKey): Promise<string> {
  const parsed = JSON.parse(encryptedStr);
  if (!parsed.iv || !parsed.ct) {
    throw new Error('Invalid encrypted payload format.');
  }

  const iv = base64ToBuffer(parsed.iv);
  const ciphertext = base64ToBuffer(parsed.ct);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

/**
 * Generates a random room ID for ephemeral signaling
 */
export function generateRoomId(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
