import { z } from 'zod';
import type { EconomicEvent } from '../../entities/intelligence.js';
import type { FeedProvider } from '../../services/cached-feed.service.js';
import { downloadText, safeExternalUrl } from './http.js';
export const economicEventSchema = z.object({ id: z.string(), title: z.string(), date: z.iso.datetime(), currency: z.literal('USD'), importance: z.enum(['high', 'medium']), sourceUrl: z.url(), actual: z.null(), forecast: z.null(), previous: z.null() });
// Convierte la hora de la fuente a UTC y conserva DST usando la base IANA de Intl.
export function calendarDate(value: string, timezone: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(value);
  if (!match) return null;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6] ?? 0));
  if (match[7]) return new Date(utc).toISOString();
  if (!timezone) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    let guess = utc;
    for (let i = 0; i < 3; i++) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(part => [part.type, part.value]));
      const displayed = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
      guess += utc - displayed;
    }
    return new Date(guess).toISOString();
  } catch { return null; }
}
export function parseBlsCalendar(ics: string): EconomicEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const result: EconomicEvent[] = [];
  for (const block of unfolded.matchAll(/BEGIN:VEVENT([\s\S]*?)END:VEVENT/g)) {
    const text = block[1] ?? '';
    if (/^STATUS:CANCELLED|^RRULE:/m.test(text)) continue;
    const start = /^DTSTART(?:;TZID=([^:\r\n]+))?:(.+)$/m.exec(text);
    const date = start ? calendarDate(start[2]?.trim() ?? '', start[1]?.replace(/"/g, '') ?? '') : null;
    const summary = /^SUMMARY:(.+)$/m.exec(text)?.[1]?.trim();
    if (!date || !summary) continue;
    const title = summary.replace(/\\n/g, ' ').replace(/\\([,;\\])/g, '$1').slice(0, 220);
    const sourceUrl = safeExternalUrl(/^URL:(.+)$/m.exec(text)?.[1]?.trim() ?? '') ?? 'https://www.bls.gov/schedule/';
    result.push({ id: /^UID:(.+)$/m.exec(text)?.[1]?.trim() ?? `${date}-${title}`, title, date, currency: 'USD', importance: /consumer price|producer price|employment situation|employment cost/i.test(title) ? 'high' : 'medium', sourceUrl, actual: null, forecast: null, previous: null });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
export class BlsProvider implements FeedProvider<EconomicEvent> {
  readonly source = { name: 'U.S. Bureau of Labor Statistics (BLS)', url: 'https://www.bls.gov/schedule/', termsUrl: 'https://www.bls.gov/bls/linksite.htm', coverage: 'Calendario oficial de publicaciones BLS de Estados Unidos; no es un calendario global ni incluye FOMC. Importancia clasificada por INFVER, sin consenso ni valores publicados. Horarios mostrados en Argentina; archivo limitado a eventos descargados.' };
  async load() { return parseBlsCalendar(await downloadText('https://www.bls.gov/schedule/news_release/bls.ics')); }
}
