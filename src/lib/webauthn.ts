/**
 * WebAuthn & Passkey Utility for Lifekina
 * Provides credential enrollment, authentication, and platform capability checks.
 */

// Check if WebAuthn and Platform Authenticator (Biometrics / Passkeys) are supported
export async function isWebAuthnSupported(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.isSecureContext || !window.PublicKeyCredential) {
    return false;
  }
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Convert ArrayBuffer / Uint8Array to Base64URL string
function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Convert Base64URL string to Uint8Array
function base64URLToBuffer(base64URL: string): Uint8Array {
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Register WebAuthn / Passkey Biometric Credential
 */
export async function registerWebAuthnCredential(username = 'Lifekina User'): Promise<{ credentialId: string }> {
  if (!window.isSecureContext) {
    throw new Error('WebAuthn requires a Secure Context (HTTPS or http://localhost). Browsers block WebAuthn on raw HTTP IP addresses like http://192.168.1.56:3000. Please access the app via http://localhost:3000 or setup HTTPS.');
  }

  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const publicKeyOptions: PublicKeyCredentialCreationOptions & { hints?: string[] } = {
    challenge,
    rp: {
      name: 'Lifekina Workspace',
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    },
    user: {
      id: userId,
      name: username,
      displayName: username,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Strictly forces native OS / Windows Hello hardware
      userVerification: 'required',         // Requires Biometric Fingerprint / Face / Windows Hello PIN
      residentKey: 'discouraged',          // Discourages cloud passkey syncing
      requireResidentKey: false,
    },
    hints: ['client-device'],              // WebAuthn L3 hint to target local client device
    timeout: 60000,
    attestation: 'none',
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions as PublicKeyCredentialCreationOptions,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('WebAuthn registration was cancelled or failed.');
  }

  const credentialId = bufferToBase64URL(credential.rawId);
  return { credentialId };
}

export const registerWindowsHelloCredential = registerWebAuthnCredential;

/**
 * Authenticate using WebAuthn / Passkey
 */
export async function authenticateWebAuthn(credentialId?: string): Promise<boolean> {
  if (!window.isSecureContext) {
    throw new Error('WebAuthn requires a Secure Context (HTTPS or http://localhost). Browsers block WebAuthn on raw HTTP IP addresses like http://192.168.1.56:3000.');
  }

  if (!window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const allowCredentials: PublicKeyCredentialDescriptor[] = credentialId
    ? [
        {
          id: base64URLToBuffer(credentialId).buffer as ArrayBuffer,
          type: 'public-key',
          transports: ['internal'],
        },
      ]
    : [];

  const publicKeyOptions: PublicKeyCredentialRequestOptions & { hints?: string[] } = {
    challenge,
    timeout: 60000,
    rpId: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    allowCredentials,
    userVerification: 'required', // Triggers WebAuthn verification prompt
    hints: ['client-device'],     // WebAuthn L3 hint to target local platform authenticator
  };

  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyOptions as PublicKeyCredentialRequestOptions,
  })) as PublicKeyCredential | null;

  return !!assertion;
}

export const authenticateWindowsHello = authenticateWebAuthn;
