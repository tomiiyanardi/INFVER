import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';
import type { Socket } from 'node:net';
import type { Express } from 'express';
// Ejecuta la pila HTTP real de Express con streams Node, sin abrir puertos.
// Permite validar rutas, JSON, CORS y errores también en entornos sin loopback.
export function inProcessClient(app: Express) {
  return (url: string, init?: RequestInit): Promise<Response> => new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const socket = new Duplex({ read() {}, write(chunk: Buffer, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
    const req = new IncomingMessage(socket as Socket);
    // El parser HTTP de Node marca complete al finalizar el cuerpo. Lo reproducimos
    // antes de que un controlador async responda, para no abortar su socket simulado.
    req.on('end', () => { req.complete = true; });
    req.method = init?.method ?? 'GET'; req.url = url;
    req.headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = typeof init?.body === 'string' ? Buffer.from(init.body) : null;
    if (body) req.headers['content-length'] = String(body.byteLength);
    const res = new ServerResponse(req);
    const timeout = setTimeout(() => { socket.destroy(); reject(new Error('La petición HTTP de prueba no terminó en cinco segundos.')); }, 5000);
    res.assignSocket(socket as Socket);
    res.on('error', reject);
    res.on('finish', () => {
      clearTimeout(timeout);
      const raw = Buffer.concat(chunks).toString('utf8');
      const separator = raw.indexOf('\r\n\r\n');
      const text = raw.slice(separator + 4);
      resolve(new Response(res.statusCode === 204 ? null : text, { status: res.statusCode, headers: Object.fromEntries(Object.entries(res.getHeaders()).map(([key, value]) => [key, String(value)])) }));
      socket.destroy();
    });
    app(req, res);
    if (body) req.push(body);
    req.push(null);
  });
}
