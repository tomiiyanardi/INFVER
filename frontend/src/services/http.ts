const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '');
export class ApiError extends Error { constructor(message: string, public readonly status: number) { super(message); } }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const timeout = AbortSignal.timeout(45_000);
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try { response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers }, signal, cache: 'no-store' }); }
  catch (error) { if (error instanceof Error && error.name === 'AbortError') throw error; throw new ApiError('No pudimos conectar con el servidor. Verificá que el backend esté iniciado.', 0); }
  if (response.status === 204) return undefined as T;
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new ApiError(response.status >= 500 ? 'No pudimos conectar con el backend. Revisá que esté iniciado en el puerto configurado.' : 'El servidor no devolvió una respuesta JSON válida.', response.status); }
  if (!response.ok) { const message = isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string' ? payload.error.message : 'No pudimos completar la operación.'; throw new ApiError(message, response.status); }
  if (!isRecord(payload) || !('data' in payload)) throw new ApiError('Respuesta del servidor no válida.', 502);
  // Frontera HTTP: el contrato REST está documentado y verificado por pruebas de integración.
  return payload.data as T;
}
