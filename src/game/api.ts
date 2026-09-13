import type { User } from './types';

export class APIError extends Error {
  constructor(message: string, public status: number, public ambiguous = false) {
    super(message);
    this.name = 'APIError';
  }
}

type Session = { access_token: string; user: User };
let accessToken: string | null = null;
let refreshFlight: Promise<Session> | null = null;
let sessionGeneration = 0;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  sessionGeneration += 1;
}

async function send<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, { ...options, headers, credentials: 'include', cache: 'no-store' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new APIError('Mất kết nối với máy chủ. Kết quả thao tác có thể đã được ghi nhận.', 0, true);
  }
  let data: unknown;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const body = data as { error?: unknown; message?: unknown } | null;
    const message = typeof body?.error === 'string' ? body.error : typeof body?.message === 'string' ? body.message : response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : 'Máy chủ chưa xử lý được yêu cầu. Vui lòng thử lại.';
    throw new APIError(message, response.status, response.status >= 500);
  }
  if (data === null && response.status !== 204) throw new APIError('Phản hồi máy chủ không đầy đủ. Vui lòng kiểm tra lại kết nối.', response.status, true);
  return data as T;
}

export async function restoreSession(): Promise<Session> {
  if (!refreshFlight) {
    const generation = sessionGeneration;
    refreshFlight = send<Session>('/auth/refresh', { method: 'POST' }).then(session => {
      if (generation !== sessionGeneration) throw new APIError('Phiên đăng nhập đã thay đổi.', 401);
      accessToken = session.access_token;
      return session;
    }).finally(() => { refreshFlight = null; });
  }
  return refreshFlight;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Đường dẫn API không hợp lệ.');
  try {
    return await send<T>(path, options);
  } catch (error) {
    if (!(error instanceof APIError) || error.status !== 401 || path.startsWith('/auth/')) throw error;
    try { await restoreSession(); } catch (refreshError) {
      if (refreshError instanceof APIError && refreshError.status === 401) {
        setAccessToken(null);
        window.dispatchEvent(new Event('game:session-expired'));
      }
      throw refreshError;
    }
    // Only reads are retried automatically. A rejected write is a new explicit intention.
    if (!options.method || options.method === 'GET' || options.method === 'HEAD') return send<T>(path, options);
    throw new APIError('Phiên đã được làm mới. Vui lòng thực hiện lại thao tác.', 401);
  }
}
