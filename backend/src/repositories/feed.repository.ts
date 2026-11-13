import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export interface FeedRepository { read(key: string): Promise<unknown>; write(key: string, value: unknown): Promise<void> }
export class FileFeedRepository implements FeedRepository {
  constructor(private readonly directory: string) {}
  async read(key: string): Promise<unknown> {
    try { return JSON.parse(await readFile(join(this.directory, `${key}.json`), 'utf8')) as unknown; }
    catch { return null; }
  }
  async write(key: string, value: unknown): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const file = join(this.directory, `${key}.json`);
    await writeFile(`${file}.tmp`, JSON.stringify(value), 'utf8');
    await rename(`${file}.tmp`, file);
  }
}
