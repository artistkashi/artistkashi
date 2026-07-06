import CryptoJS from "crypto-js";

// Centralized localStorage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: "artistkashi_auth_token",
  AUTH_REFRESH_TOKEN: "artistkashi_auth_refresh_token",
  AUTH_USER: "artistkashi_auth_user",
  DEVICE_ID: "artistkashi_device_id",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY ?? "";
const ENCRYPTION_ENABLED =
  process.env.NODE_ENV === "production" && ENCRYPTION_KEY.length > 0;

function encryptValue(plain: string): string {
  if (!ENCRYPTION_ENABLED) return plain;
  try {
    return CryptoJS.AES.encrypt(plain, ENCRYPTION_KEY).toString();
  } catch {
    return plain;
  }
}

function decryptValue(encrypted: string): string {
  if (!ENCRYPTION_ENABLED) return encrypted;
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encrypted;
  } catch {
    return encrypted;
  }
}

export function setItem(key: StorageKey, value: string): void {
  try {
    const out = encryptValue(value);
    localStorage.setItem(key, out);
  } catch {
    // Silent fail - storage may not be available
  }
}

export function getItem(key: StorageKey): string | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return decryptValue(raw);
  } catch {
    return null;
  }
}

export function removeItem(key: StorageKey): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // no-op
  }
}

export function setJSON<T>(key: StorageKey, value: T): void {
  setItem(key, JSON.stringify(value));
}

export function getJSON<T>(key: StorageKey): T | null {
  const raw = getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearAll(): void {
  try {
    localStorage.clear();
  } catch {
    //
  }
}
