import type { RequestHandler } from 'express';
export const requestLogger: RequestHandler = (req, res, next) => {
  const started = performance.now();
  res.on('finish', () => console.info(JSON.stringify({ method: req.method, path: req.path, status: res.statusCode, durationMs: Math.round(performance.now() - started) })));
  next();
};
