import type { Analysis, ModuleId } from '../types';

export async function analyzeImage(module: ModuleId, base64: string, note: string, signal?: AbortSignal): Promise<Analysis> {
  let res: Response;
  try {
    res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ module, image: base64, mime: 'image/jpeg', note }),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Stopped.');
    throw new Error('Could not reach the server. Check your connection.');
  }
  const data = (await res.json().catch(() => null)) as { ok: boolean; result?: Analysis; error?: string } | null;
  if (!res.ok || !data?.ok || !data.result) throw new Error(data?.error ?? `Request failed (${res.status}).`);
  return data.result;
}
