// Verificación del dominio sin dependencias npm. Requiere Node >= 22.13.
import { stripTypeScriptTypes } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'infver-domain-'));
const files = ['src/entities/domain.ts', 'src/asset-education.ts', 'src/repositories/contracts.ts', 'src/repositories/memory.repository.ts', 'src/seed.ts', 'src/services/errors.ts', 'src/services/profile.service.ts', 'src/services/recommendation.service.ts', 'src/services/portfolio.service.ts', 'tests/domain.test.ts'];
try {
  writeFileSync(join(temporary, 'package.json'), '{"type":"module"}');
  for (const file of files) {
    const output = join(temporary, file.replace(/\.ts$/, '.js'));
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, stripTypeScriptTypes(readFileSync(join(root, 'backend', file), 'utf8'), { mode: 'transform' }));
  }
  const result = spawnSync(process.execPath, ['--test', join(temporary, 'tests/domain.test.js')], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally { rmSync(temporary, { recursive: true, force: true }); }
