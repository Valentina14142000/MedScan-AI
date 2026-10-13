import { analyze, rateLimited, type AnalyzeInput } from './_lib/analyze';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (rateLimited(ip)) return json(429, { ok: false, error: 'Too many requests. Please wait a minute.' });
  let input: AnalyzeInput;
  try {
    input = (await request.json()) as AnalyzeInput;
  } catch {
    return json(400, { ok: false, error: 'Invalid request body.' });
  }
  const reply = await analyze(input, process.env);
  return json(reply.status, reply.body);
}
