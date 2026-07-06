import { getItem, setItem, STORAGE_KEYS } from "@/lib/storage";

function generateUUID(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

export function getDeviceId(): string {
  let id = getItem(STORAGE_KEYS.DEVICE_ID);
  if (!id) {
    id = generateUUID();
    setItem(STORAGE_KEYS.DEVICE_ID, id);
  }
  return id;
}
