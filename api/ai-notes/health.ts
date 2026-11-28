import { getConfiguredGeminiModels, getServerGeminiKey } from '../_lib/aiNotesEngine.ts';
import { sendJson, type ApiRequest, type ApiResponse } from '../_lib/http.ts';
import { hasSupabaseAdminConfigured } from '../_lib/supabaseServer.ts';

export default function handler(req: ApiRequest, res: ApiResponse): void {
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed. Use GET.' }, { Allow: 'GET' });
    return;
  }
  sendJson(res, 200, {
    ok: true,
    envConfigured: Boolean(getServerGeminiKey()),
    supabaseAdminConfigured: hasSupabaseAdminConfigured(),
    models: getConfiguredGeminiModels(),
  });
}
