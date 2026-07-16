export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || res.statusText, res.status, body.code);
  }
  return res.json();
}

export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  return handle<T>(res);
}

export async function apiSend<T = any>(url: string, method: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}
