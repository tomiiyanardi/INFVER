import { z } from 'zod';
import type { FeedSnapshot, FeedSource } from '../entities/intelligence.js';
import type { FeedRepository } from '../repositories/feed.repository.js';
export interface FeedProvider<T> { source: FeedSource; notice?: string; load(): Promise<T[]> }
export class ProviderUnavailable extends Error {
  constructor(message: string, public readonly retryAfterMs = 15 * 60_000) { super(message); }
}
export class CachedFeed<T> {
  private items: T[] = [];
  private fetchedAt: string | null = null;
  private fetchedSource: FeedSource | null = null;
  private nextAttempt = 0;
  private failure = '';
  private pending: Promise<FeedSnapshot<T>> | null = null;
  private restored = false;
  constructor(
    private readonly key: string,
    private readonly provider: FeedProvider<T>,
    private readonly itemSchema: z.ZodType<T>,
    private readonly intervalMs: number,
    private readonly repository?: FeedRepository,
    private readonly enabled = true,
    private readonly disabledMessage = '',
    private readonly merge?: (current: T[], incoming: T[]) => T[],
    private readonly clock: () => number = Date.now,
  ) {}
  async get(): Promise<FeedSnapshot<T>> {
    if (!this.enabled) return this.snapshot();
    if (this.pending) return this.pending;
    this.pending = this.update().finally(() => { this.pending = null; });
    return this.pending;
  }
  private async update(): Promise<FeedSnapshot<T>> {
    if (!this.restored) {
      this.restored = true;
      const saved = z.object({ items: z.array(this.itemSchema), fetchedAt: z.iso.datetime(), source: z.object({ name: z.string(), url: z.url(), termsUrl: z.url(), coverage: z.string() }).optional() }).safeParse(await this.repository?.read(this.key));
      if (saved.success) {
        this.items = saved.data.items; this.fetchedAt = saved.data.fetchedAt;
        this.fetchedSource = saved.data.source ?? this.provider.source;
        this.nextAttempt = new Date(saved.data.fetchedAt).getTime() + this.intervalMs;
      }
    }
    if (this.clock() < this.nextAttempt) return this.snapshot();
    this.nextAttempt = this.clock() + this.intervalMs;
    try {
      const incoming = z.array(this.itemSchema).parse(await this.provider.load());
      this.items = this.merge ? this.merge(this.items, incoming) : incoming;
      this.fetchedAt = new Date(this.clock()).toISOString(); this.failure = '';
      this.fetchedSource = structuredClone(this.provider.source);
      try { await this.repository?.write(this.key, { items: this.items, fetchedAt: this.fetchedAt, source: this.fetchedSource }); }
      catch { console.warn(`No se pudo persistir el feed ${this.key}. Se conserva en memoria.`); }
    } catch (error) {
      // Nunca se publican mensajes externos que puedan incluir credenciales o URLs privadas.
      this.failure = error instanceof ProviderUnavailable ? error.message : 'La fuente no está disponible o cambió su formato. No se inventaron datos.';
      console.warn(JSON.stringify({ feed: this.key, status: 'provider-error', reason: this.failure }));
      this.nextAttempt = this.clock() + (error instanceof ProviderUnavailable ? Math.max(5_100, error.retryAfterMs) : Math.min(this.intervalMs, 60_000));
    }
    return this.snapshot();
  }
  private snapshot(): FeedSnapshot<T> {
    const expired = this.fetchedAt !== null && this.clock() >= new Date(this.fetchedAt).getTime() + this.intervalMs;
    return { status: !this.enabled ? 'disabled' : this.failure || expired ? this.fetchedAt ? 'stale' : 'unavailable' : this.fetchedAt ? 'updated' : 'unavailable',
      items: structuredClone(this.items), fetchedAt: this.fetchedAt, nextRefreshAt: this.enabled && this.nextAttempt ? new Date(this.nextAttempt).toISOString() : null,
      message: !this.enabled ? this.disabledMessage : this.failure || this.provider.notice || (expired ? 'La última descarga está pendiente de actualización.' : 'Información de la última descarga. No implica tiempo real.'), source: structuredClone(this.fetchedSource ?? this.provider.source) };
  }
}
