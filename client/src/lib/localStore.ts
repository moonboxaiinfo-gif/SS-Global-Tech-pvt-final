export function loadLocalValue<T>(key: string, fallback: T): T {
 if (typeof window === "undefined") return fallback;
 try {
 const raw = window.localStorage.getItem(key);
 return raw ? (JSON.parse(raw) as T) : fallback;
 } catch {
 return fallback;
 }
}

export function saveLocalValue<T>(key: string, value: T) {
 if (typeof window === "undefined") return;
 try {
 window.localStorage.setItem(key, JSON.stringify(value));
 window.dispatchEvent(new CustomEvent("ss-global-local-store", { detail: { key } }));
 } catch {
 // Local fallback should never make the ERP unusable when storage is unavailable.
 }
}

export function removeLocalValue(key: string) {
 if (typeof window === "undefined") return;
 try {
 window.localStorage.removeItem(key);
 window.dispatchEvent(new CustomEvent("ss-global-local-store", { detail: { key } }));
 } catch {
 // Ignore storage failures and keep the current in-memory state usable.
 }
}
