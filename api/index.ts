import { sendJson, type ApiRequest, type ApiResponse } from './_lib/http.ts';

export default function handler(_req: ApiRequest, res: ApiResponse): void {
  sendJson(res, 404, { error: 'API endpoint not found.' });
}
