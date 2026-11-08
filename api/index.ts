import type { Request, Response } from 'express';
import app from '../server';

export const config = {
  maxDuration: 60,
};

export default function handler(req: Request, res: Response) {
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`;
  }
  return app(req, res);
}
