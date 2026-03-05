/**
 * Import du CSV Mercuriale dans la base Prisma.
 * Usage: node scripts/import-mercurial.js <chemin_csv>
 * Exemple: node scripts/import-mercurial.js ../../scripts/mercurial_ouagadougou.csv
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';

const prisma = new PrismaClient();

const BATCH_SIZE = 200;

function parseCSVLine(line) {
  const result = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length && line[i] !== '"') {
        field += line[i++];
      }
      if (line[i] === '"') i++;
      result.push(field);
      if (line[i] === ',') i++;
    } else {
      let field = '';
      while (i < line.length && line[i] !== ',') {
        field += line[i++];
      }
      result.push(field.trim());
      if (line[i] === ',') i++;
    }
  }
  return result;
}

async function importCSV(csvPath, regionId) {
  const resolved = resolve(csvPath);
  const stream = createReadStream(resolved, { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  let batch = [];
  let total = 0;
  let errors = 0;
  const seen = new Map(); // (code, conditionnement) -> index in batch (pour déduplication)

  for await (const line of rl) {
    const cols = parseCSVLine(line);
    if (!headers) {
      headers = cols;
      continue;
    }
    if (cols.length < headers.length) continue;

    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));

    const toInt = (v) => {
      if (!v || typeof v !== 'string') return null;
      const cleaned = String(v).replace(/\s/g, '').trim();
      const n = parseInt(cleaned, 10);
      return !isNaN(n) ? n : null;
    };
    const prix_min = toInt(row.prix_min);
    const prix_moyen = toInt(row.prix_moyen);
    const prix_max = toInt(row.prix_max) ?? toInt(row.prix_unitaire_plafond);
    // Ignorer les lignes sans code ni désignation
    if (!row.code && !row.designation) continue;

    const cond = (row.unite || 'Unité').trim();
    const code = (row.code || '').trim();
    if (!code) continue;
    if (!/^\d{2}\.\d/.test(code)) continue; // Ignorer codes invalides (extraction PDF défaillante)

    let designation = (row.designation || '').trim();
    let finalCode = code;
    // Cas 1: "Groupe X : ..." mal parsé en code -> mettre en désignation, code synthétique
    if (!designation && /^Groupe\s+\d+\s*:/.test(code)) {
      designation = code;
      finalCode = code.replace(/\s*:.*/, '').replace(/\s+/g, '-').toLowerCase();
    }
    // Cas 2: désignation vide (catégorie) -> utiliser le code
    if (!designation) designation = finalCode;

    const key = `${finalCode}|||${cond}`;
    if (seen.has(key)) continue; // Déduplication
    seen.set(key, true);

    batch.push({
      code: finalCode,
      designation,
      conditionnement: cond,
      prix_min: prix_min ?? undefined,
      prix_moyen: prix_moyen ?? undefined,
      prix_max: prix_max ?? undefined,
      regionId: regionId,
      companyId: 'template',
    });

    if (batch.length >= BATCH_SIZE) {
      const { ok, fail } = await upsertBatch(batch);
      total += ok;
      errors += fail;
      if (total % 1000 === 0 && total > 0) console.log(`  Importé: ${total} lignes`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const { ok, fail } = await upsertBatch(batch);
    total += ok;
    errors += fail;
  }

  return { total, errors };
}

async function upsertBatch(batch) {
  let ok = 0;
  let fail = 0;
  for (const item of batch) {
    try {
      await prisma.mercurialeArticle.upsert({
        where: {
          code_conditionnement_regionId_companyId: {
            code: item.code,
            conditionnement: item.conditionnement,
            regionId: item.regionId,
            companyId: item.companyId,
          },
        },
        create: item,
        update: {
          designation: item.designation,
          prix_min: item.prix_min,
          prix_moyen: item.prix_moyen,
          prix_max: item.prix_max,
        },
      });
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 3) console.error(`  Erreur ligne ${item.code}/${item.conditionnement}:`, e.message?.slice(0, 80));
    }
  }
  return { ok, fail };
}

async function main() {
  const args = process.argv.slice(2);
  const replace = args.includes('--replace');
  const regionIdx = args.indexOf('--region');
  const regionId = regionIdx >= 0 && args[regionIdx + 1] ? args[regionIdx + 1] : 'ouagadougou';
  const csvPath = args.find((a) => !a.startsWith('--') && a !== regionId) || resolve(process.cwd(), `../../scripts/mercurial_${regionId}.csv`);

  // Vérifier que région et company existent (nécessaires pour la clé étrangère)
  const [region, company] = await Promise.all([
    prisma.region.findUnique({ where: { id: regionId } }),
    prisma.company.findUnique({ where: { id: 'template' } }),
  ]);
  if (!region || !company) {
    console.error(`Erreur: Exécutez d'abord "npm run db:seed" pour créer la région ${regionId} et la company template.`);
    process.exit(1);
  }

  console.log('Import Mercuriale depuis:', csvPath, '(région:', regionId, ')');
  if (replace) {
    const deleted = await prisma.mercurialeArticle.deleteMany({
      where: { regionId, companyId: 'template' },
    });
    console.log('  Anciennes données supprimées:', deleted.count);
  }
  console.log('-'.repeat(50));

  const { total, errors } = await importCSV(csvPath, regionId);

  console.log('-'.repeat(50));
  console.log(`Terminé: ${total} articles importés${errors ? `, ${errors} erreurs` : ''}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
