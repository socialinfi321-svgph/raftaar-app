import type { IncomingMessage, ServerResponse } from 'node:http';

export const MAX_REQUEST_BYTES = 1024 * 1024; // 1 MB hard cap (well under Vercel's 4.5 MB limit)

export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  ip?: string;
  query?: unknown;
}

export type ApiResponse = ServerResponse;

export class ApiError extends Error {
  readonly status: number;
  readonly headers?: Record<string, string>;

  constructor(status: number, message: string, headers?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.headers = headers;
  }
}

export function sanitizePublicMessage(input: unknown, fallback = 'Request failed.'): string {
  const text = String(input || '')
    .replace(/AIza[0-9A-Za-z_-]{12,}/g, '[REDACTED]')
    .replace(/AQ\.[0-9A-Za-z._-]{12,}/g, '[REDACTED]')
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1[REDACTED]')
    .trim();
  if (!text) return fallback;
  return text.slice(0, 240);
}

export function sendJson(
  res: ApiResponse,
  status: number,
  data: unknown,
  extraHeaders?: Record<string, string>
): void {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      res.setHeader(k, v);
    }
  }
  res.end(JSON.stringify(data));
}

export function requirePost(req: ApiRequest, res: ApiResponse): boolean {
  if ((req.method || '').toUpperCase() === 'POST') {
    return true;
  }
  sendJson(
    res,
    405,
    { error: 'Method not allowed. Use POST.' },
    { Allow: 'POST' }
  );
  return false;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();
const MAX_RATE_BUCKETS = 2000;

export function getClientIp(req: ApiRequest): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim().slice(0, 64);
  }
  if (Array.isArray(xff) && xff.length > 0 && xff[0]) {
    return String(xff[0]).split(',')[0].trim().slice(0, 64);
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim().slice(0, 64);
  }
  if (typeof req.ip === 'string' && req.ip.trim()) {
    return req.ip.trim().slice(0, 64);
  }
  return String(req.socket?.remoteAddress || 'unknown').slice(0, 64);
}

export function enforceRateLimit(
  req: ApiRequest,
  res: ApiResponse,
  opts: { limit?: number; windowMs?: number; scope?: string } = {}
): boolean {
  const limit = opts.limit ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const scope = opts.scope ?? 'ai-notes';
  const now = Date.now();
  const key = `${scope}:${getClientIp(req)}`;

  if (rateBuckets.size >= MAX_RATE_BUCKETS) {
    for (const [bucketKey, bucket] of rateBuckets.entries()) {
      if (bucket.resetAt <= now) {
        rateBuckets.delete(bucketKey);
      }
    }
    if (rateBuckets.size >= MAX_RATE_BUCKETS) {
      rateBuckets.clear();
    }
  }

  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));

  if (bucket.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    sendJson(
      res,
      429,
      { error: 'Too many requests. Please wait a moment before retrying.' },
      { 'Retry-After': String(retryAfterSec) }
    );
    return false;
  }

  return true;
}

export async function readJsonBody(
  req: ApiRequest,
  maxBytes: number = MAX_REQUEST_BYTES
): Promise<Record<string, unknown>> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > maxBytes) {
        throw new ApiError(413, 'Request payload exceeds maximum allowed size.');
      }
      try {
        const parsed = req.body.trim() ? JSON.parse(req.body) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new ApiError(400, 'Request body must be a JSON object.');
        }
        return parsed as Record<string, unknown>;
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(400, 'Invalid JSON request body.');
      }
    }

    if (Buffer.isBuffer(req.body)) {
      if (req.body.byteLength > maxBytes) {
        throw new ApiError(413, 'Request payload exceeds maximum allowed size.');
      }
      try {
        const str = req.body.toString('utf8').trim();
        const parsed = str ? JSON.parse(str) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new ApiError(400, 'Request body must be a JSON object.');
        }
        return parsed as Record<string, unknown>;
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(400, 'Invalid JSON request body.');
      }
    }

    if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
      throw new ApiError(400, 'Request body must be a JSON object.');
    }

    const encodedSize = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
    if (encodedSize > maxBytes) {
      throw new ApiError(413, 'Request payload exceeds maximum allowed size.');
    }
    return req.body as Record<string, unknown>;
  }

  const contentLength = Number(req.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new ApiError(413, 'Request payload exceeds maximum allowed size.');
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    req.on('data', (chunk: Buffer | string) => {
      if (settled) return;
      const buf = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
      totalBytes += buf.byteLength;
      if (totalBytes > maxBytes) {
        settled = true;
        reject(new ApiError(413, 'Request payload exceeds maximum allowed size.'));
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    });
    req.on('error', () => {
      if (!settled) {
        settled = true;
        reject(new ApiError(400, 'Failed to read request body.'));
      }
    });
  });

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    throw new ApiError(400, 'Request body is required.');
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ApiError(400, 'Request body must be a JSON object.');
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, 'Invalid JSON request body.');
  }
}

export function withPostJsonHandler(
  handler: (body: Record<string, unknown>, req: ApiRequest, res: ApiResponse) => Promise<unknown>,
  options: { limit?: number; windowMs?: number; maxBytes?: number; scope?: string } = {}
) {
  return async (req: ApiRequest, res: ApiResponse): Promise<void> => {
    try {
      if (!requirePost(req, res)) return;
      if (!enforceRateLimit(req, res, options)) return;
      const body = await readJsonBody(req, options.maxBytes ?? MAX_REQUEST_BYTES);
      const result = await handler(body, req, res);
      sendJson(res, 200, result);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        sendJson(
          res,
          err.status,
          { error: sanitizePublicMessage(err.message) },
          err.headers
        );
        return;
      }
      sendJson(res, 500, {
        error: sanitizePublicMessage(
          (err as { message?: string })?.message,
          'Unexpected server error.'
        ),
      });
    }
  };
}
