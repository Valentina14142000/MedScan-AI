// Shared analysis core: used by the Vercel function (api/analyze.ts)
// and by the Vite dev server middleware (vite.config.ts).

export type ModuleId = 'xray' | 'mri' | 'skin';

const DESC: Record<ModuleId, string> = {
  xray: 'a chest X-ray (radiograph)',
  mri: 'a brain MRI slice',
  skin: 'a close-up photo of skin',
};

const MAX_BASE64 = 4_000_000; // ~3 MB image, under Vercel's 4.5 MB body limit
const MIMES = ['image/jpeg', 'image/png', 'image/webp'];

export interface AnalyzeInput {
  module?: unknown;
  image?: unknown; // base64, no data: prefix
  mime?: unknown;
  note?: unknown;
}

export interface Analysis {
  image_type_match: boolean;
  quality: 'good' | 'limited' | 'poor';
  quality_note: string;
  observations: string[];
  considerations: string[];
  follow_up: 'routine' | 'soon' | 'urgent';
  follow_up_note: string;
  limitations: string;
}

export interface Reply {
  status: number;
  body: { ok: true; result: Analysis; model: string } | { ok: false; error: string };
}

const fail = (status: number, error: string): Reply => ({ status, body: { ok: false, error } });

export function buildPrompt(mod: ModuleId, note: string): string {
  const d = DESC[mod];
  return `You support an EDUCATIONAL image-review tool, not a medical device. The user says the attached image is ${d}. User note (may be empty): "${note.replace(/"/g, "'")}"
Return ONLY a JSON object with keys: image_type_match (boolean: does the image really look like ${d}?), quality ("good"|"limited"|"poor"), quality_note (string), observations (array of up to 6 short strings describing only what is visible), considerations (array of up to 4 strings, each starting with "A clinician may want to evaluate" or similar, naming general possibilities without asserting a diagnosis), follow_up ("routine"|"soon"|"urgent"), follow_up_note (one sentence of general guidance), limitations (one sentence on what cannot be judged from this image).
Rules: never state a definitive diagnosis; never give probabilities, percentages, or confidence scores; if unsure, choose "soon" over "routine"; if image_type_match is false, return empty observations and considerations and explain in quality_note.`;
}

const strs = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max).map((s) => s.slice(0, 400)) : [];
const str = (v: unknown): string => (typeof v === 'string' ? v.slice(0, 600) : '');

export function normalize(raw: unknown): Analysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const match = r.image_type_match !== false;
  const quality = r.quality === 'good' || r.quality === 'limited' || r.quality === 'poor' ? r.quality : 'limited';
  const follow = r.follow_up === 'routine' || r.follow_up === 'soon' || r.follow_up === 'urgent' ? r.follow_up : 'soon';
  return {
    image_type_match: match,
    quality,
    quality_note: str(r.quality_note),
    observations: match ? strs(r.observations, 6) : [],
    considerations: match ? strs(r.considerations, 4) : [],
    follow_up: follow,
    follow_up_note: str(r.follow_up_note),
    limitations: str(r.limitations),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Best-effort per-IP rate limit (resets on cold start; fine for a demo).
const hits = new Map<string, number[]>();
export function rateLimited(ip: string, limit = 12, windowMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > limit;
}

export async function analyze(input: AnalyzeInput, env: Record<string, string | undefined>): Promise<Reply> {
  const key = env.GEMINI_API_KEY;
  if (!key) return fail(500, 'Server is missing GEMINI_API_KEY. Add it to .env (local) or the host environment variables.');

  const mod = input.module as ModuleId;
  if (!(mod in DESC)) return fail(400, 'Unknown module.');
  if (typeof input.image !== 'string' || input.image.length < 100) return fail(400, 'No image received.');
  if (input.image.length > MAX_BASE64) return fail(413, 'Image is too large. Try a smaller one.');
  if (typeof input.mime !== 'string' || !MIMES.includes(input.mime)) return fail(400, 'Use a JPG, PNG or WebP image.');
  const note = typeof input.note === 'string' ? input.note.slice(0, 400) : '';

  const models = [env.GEMINI_MODEL, 'gemini-3.8-flash', 'gemini-flash-latest'].filter(
    (m, i, a): m is string => !!m && a.indexOf(m) === i,
  );
  const body = JSON.stringify({
    contents: [{ parts: [{ text: buildPrompt(mod, note) }, { inline_data: { mime_type: input.mime, data: input.image } }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  });

  let lastStatus = 502;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt++) {
      let res: Response;
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body,
        });
      } catch {
        lastStatus = 502;
        await sleep(600 * (attempt + 1));
        continue;
      }
      lastStatus = res.status;
      if (res.ok) {
        const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        try {
          const result = normalize(JSON.parse(text.replace(/^```json\s*|```$/g, '').trim()));
          if (result) return { status: 200, body: { ok: true, result, model } };
        } catch {
          /* fall through to retry */
        }
        await sleep(400);
        continue;
      }
      if (res.status === 404) break; // model unavailable: try next
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return fail(502, 'The AI provider rejected the request. Check GEMINI_API_KEY and that the image is valid.');
      }
      await sleep(800 * (attempt + 1)); // 429 / 5xx: back off, retry
    }
  }
  return fail(lastStatus === 429 ? 429 : 502, lastStatus === 429 ? 'The AI service is busy (rate limit). Please try again in a minute.' : 'The AI service is unavailable right now. Please try again.');
}
