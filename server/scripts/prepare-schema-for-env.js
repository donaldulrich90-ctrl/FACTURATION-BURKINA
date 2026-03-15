/**
 * Adapte le schéma Prisma selon DATABASE_URL :
 * - postgresql:// ou postgres:// → provider = "postgresql"
 * - file: ou autre → provider = "sqlite" (développement local)
 * S'exécute avant prisma generate pour garantir la cohérence.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDir = resolve(__dirname, '..');
const schemaPath = resolve(serverDir, 'prisma', 'schema.prisma');

// Charger .env depuis server/
config({ path: resolve(serverDir, '.env') });

const url = (process.env.DATABASE_URL || '').trim();
const usePostgres = url.startsWith('postgresql://') || url.startsWith('postgres://');

const provider = usePostgres ? 'postgresql' : 'sqlite';
const datasourceUrl = usePostgres ? 'env("DATABASE_URL")' : '"file:./dev.db"';

let schema = readFileSync(schemaPath, 'utf8');

// Remplacer le bloc datasource
const datasourceBlock = `datasource db {
  provider = "${provider}"
  url      = ${datasourceUrl}
}`;

schema = schema.replace(
  /datasource\s+db\s*\{[^}]*\}/s,
  datasourceBlock
);

writeFileSync(schemaPath, schema);
console.log(`✓ Schéma Prisma configuré pour ${provider === 'postgresql' ? 'PostgreSQL' : 'SQLite'}`);
