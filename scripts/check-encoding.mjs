import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const invalid = [];
function walk(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) walk(path);
    else if (/\.(tsx?|css|md)$/.test(item.name)) {
      const content = readFileSync(path, 'utf8');
      if (/[\u00c3\u00c2]|\u00e2\u20ac|\ufffd/.test(content)) invalid.push(path);
    }
  }
}
walk(join(root, 'frontend/src')); walk(join(root, 'backend/src'));
if (invalid.length) { console.error('Texto con codificación incorrecta:', ...invalid); process.exitCode = 1; }
else console.log('Textos UTF-8 correctos: sin caracteres de reemplazo ni mojibake.');
