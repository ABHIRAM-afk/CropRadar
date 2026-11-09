import type { Request, Response } from 'express';
import app from '../server.ts';

export const config = {
  maxDuration: 60,
};

function normalizeVercelUrl(req: Request) {
  // 1. If Vercel passed the original URI in headers, prefer it
  const forwardedUri = (req.headers['x-forwarded-uri'] || req.headers['x-matched-path']) as string | undefined;
  if (forwardedUri && forwardedUri.startsWith('/api')) {
    req.url = forwardedUri;
    return;
  }

  // 2. Handle Next/Vercel catch-all [...path] query parameters if matched
  const rawPath = (req.query as any)?.path;
  if (rawPath && req.url && (req.url.includes('[...path]') || req.url.includes('[path]'))) {
    const segments = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
    const qIdx = req.url.indexOf('?');
    const queryString = qIdx !== -1 ? req.url.substring(qIdx) : '';
    req.url = `/api/${segments}${queryString}`;
    delete (req.query as any).path;
    return;
  }

  // 3. Ensure leading /api prefix is present for Express routing
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
}

export default function handler(req: Request, res: Response) {
  normalizeVercelUrl(req);
  return app(req, res);
}
