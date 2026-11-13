import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../services/errors.js';
export const errorMiddleware: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisá los datos ingresados.', details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) } }); return; }
  if (error instanceof AppError) { res.status(error.status).json({ error: { code: error.code, message: error.message } }); return; }
  if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo JSON no es válido.' } }); return; }
  if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') { res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'La petición supera el tamaño permitido.' } }); return; }
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.' } });
};
