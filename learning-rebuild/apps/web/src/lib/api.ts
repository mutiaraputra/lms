// =============================================================================
// Klien API terpusat untuk web (Fase 2 — fondasi frontend).
//
// - Base URL default '/api' (di belakang Nginx server lokal). Override via
//   NEXT_PUBLIC_API_URL untuk dev terpisah (mis. http://localhost:4000/api).
// - Menyimpan access + refresh token (localStorage).
// - Otomatis mencoba refresh saat 401 lalu mengulang permintaan (single-flight:
//   banyak permintaan 401 berbagi satu proses refresh).
// - Melempar ApiError pada respons non-2xx dengan pesan dari body API.
// =============================================================================

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

const TOKEN_KEY = 'token';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

export type Role = 'ADMIN' | 'GURU' | 'SISWA';

export interface SessionUser {
  id: number;
  username: string;
  email?: string | null;
  name: string;
  role: Role;
  avatar?: string | null;
  teacherProfile?: any;
  studentProfile?: any;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

/** Error terstruktur untuk respons API non-2xx. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// ---- Penyimpanan sesi (client-only) --------------------------------------

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(session: { accessToken: string; refreshToken?: string; user?: SessionUser }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  if (session.refreshToken) localStorage.setItem(REFRESH_KEY, session.refreshToken);
  if (session.user) localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

// ---- Refresh token (single-flight) ---------------------------------------

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Tukar refresh token dengan access token baru. Semua pemanggil bersamaan
 * berbagi satu Promise agar tidak terjadi rotasi ganda (yang justru mencabut
 * token yang baru diterbitkan).
 */
async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { accessToken: string; refreshToken: string };
      setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** Redirect ke halaman login setelah sesi tidak dapat dipulihkan. */
function forceLogout() {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

// ---- Permintaan inti ------------------------------------------------------

interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** Body JSON (akan di-stringify). Untuk FormData, gunakan `rawBody`. */
  json?: unknown;
  /** Body mentah (mis. FormData) — Content-Type dibiarkan browser. */
  rawBody?: BodyInit;
  /** Jangan lampirkan token (mis. endpoint publik). */
  skipAuth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
  const { json, rawBody, skipAuth, headers, ...rest } = options;

  const finalHeaders = new Headers(headers || {});
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  let body: BodyInit | undefined;
  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json');
    body = JSON.stringify(json);
  } else if (rawBody !== undefined) {
    body = rawBody; // Content-Type ditentukan browser (mis. multipart boundary)
  }

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders, body });

  // Coba refresh sekali pada 401 (kecuali permintaan tanpa auth / sudah retry).
  if (res.status === 401 && !skipAuth && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
    forceLogout();
    throw new ApiError(401, 'Sesi berakhir. Silakan masuk kembali.');
  }

  // 204 / body kosong.
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    const message =
      (isJson && payload && (payload.message || payload.error)) ||
      (typeof payload === 'string' && payload) ||
      `Permintaan gagal (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : String(message), payload);
  }

  return payload as T;
}

// ---- Helper publik --------------------------------------------------------

export function apiGet<T = any>(path: string, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'GET' });
}

export function apiPost<T = any>(path: string, json?: unknown, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'POST', json });
}

export function apiPut<T = any>(path: string, json?: unknown, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'PUT', json });
}

export function apiPatch<T = any>(path: string, json?: unknown, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'PATCH', json });
}

export function apiDelete<T = any>(path: string, options?: RequestOptions) {
  return request<T>(path, { ...options, method: 'DELETE' });
}

/** Unggah FormData (mis. berkas tugas/izin). */
export function apiUpload<T = any>(path: string, formData: FormData, method: 'POST' | 'PUT' = 'POST') {
  return request<T>(path, { method, rawBody: formData });
}

/**
 * Kompatibilitas mundur untuk kode lama yang memanggil fetchWithAuth().
 * Mengembalikan JSON terurai; melempar ApiError pada kegagalan.
 * @deprecated Gunakan apiGet/apiPost/dst.
 */
export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const json = options.body ? JSON.parse(options.body as string) : undefined;
  return request<any>(path, { ...(options as RequestOptions), method, json });
}
