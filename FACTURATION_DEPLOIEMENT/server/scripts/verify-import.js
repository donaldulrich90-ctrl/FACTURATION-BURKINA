/**
 * Vérification de l'import Mercuriale
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolve } from 'path';

const prisma = new PrismaClient();

function parseCSVLine(line) {
  const result = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let field = '';
      i++;
      while (i < line.length && line[i] !== '"') field += line[i++];
      if (line[i] === '"') i++;
      result.push(field);
      if (line[i] === ',') i++;
    } else {
      let field = '';
      while (i < line.length && line[i] !== ',') field += line[i++];
      result.push(field.trim());
      if (line[i] === ',') i++;
    }
  }
  return result;
}

async function loadCSVKeys(csvPath) {
  const stream = createReadStream(resolve(csvPath), { encoding: 'utf-8' });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;
  const keys = new Set();
  const withPrice = new Set();
  for await (const line of rl) {
    const cols = parseCSVLine(line);
    if (!headers) {
      headers = cols;
      continue;
    }
    const row = {};
    headers.forEach((h, i) => (row[h] = cols[i] || ''));
    const code = (row.code || '').trim();
    const cond = (row.unite || 'Unité').trim();
    if (!code) continue;
    const key = `${code}|||${cond}`;
    keys.add(key);
    if (row.prix_unitaire_plafond?.trim()) withPrice.add(key);
  }
  return { keys, withPrice };
}

async function main() {
  const csvPath = process.argv[2] || resolve(process.cwd(), '../scripts/mercurial_ouagadougou.csv');
  console.log('=== Vérification import Mercuriale ===\n');

  // 1. Comptage base
  const count = await prisma.mercurialeArticle.count({
    where: { regionId: 'ouagadougou', companyId: 'template' },
  });
  console.log('1. Base de données:');
  console.log('   Articles (ouagadougou/template):', count);

  // 2. CSV
  const { keys: csvKeys, withPrice } = await loadCSVKeys(csvPath);
  console.log('\n2. Fichier CSV:');
  console.log('   Lignes uniques (code+unite):', csvKeys.size);
  console.log('   Avec prix:', withPrice.size);

  // 3. Comparaison
  const dbArticles = await prisma.mercurialeArticle.findMany({
    where: { regionId: 'ouagadougou', companyId: 'template' },
    select: { code: true, conditionnement: true, prix_max: true },
  });
  const dbKeys = new Set(
    dbArticles.map((a) => `${a.code}|||${a.conditionnement}`)
  );
  const dbWithPrice = new Set(
    dbArticles.filter((a) => a.prix_max != null).map((a) => `${a.code}|||${a.conditionnement}`)
  );

  const manquants = [...csvKeys].filter((k) => !dbKeys.has(k));
  const enPlus = [...dbKeys].filter((k) => !csvKeys.has(k));

  console.log('\n3. Comparaison CSV vs Base:');
  console.log('   Manquants en base:', manquants.length);
  console.log('   En base mais pas dans CSV:', enPlus.length);

  if (manquants.length > 0 && manquants.length <= 10) {
    console.log('   Exemples manquants:', manquants.slice(0, 5));
  } else if (manquants.length > 10) {
    console.log('   Exemples manquants:', manquants.slice(0, 5));
  }

  // 4. Qualité des données
  const sansPrixDb = dbArticles.filter((a) => a.prix_max == null).length;
  const sansDesignation = await prisma.mercurialeArticle.count({
    where: { regionId: 'ouagadougou', companyId: 'template', designation: '' },
  });
  const prixInvalides = await prisma.mercurialeArticle.count({
    where: {
      regionId: 'ouagadougou',
      companyId: 'template',
      prix_max: { lt: 0 },
    },
  });
  console.log('\n4. Qualité des données:');
  console.log('   Articles sans prix (catégories):', sansPrixDb);
  console.log('   Désignations vides:', sansDesignation);
  if (sansDesignation > 0) {
    const vides = await prisma.mercurialeArticle.findMany({
      where: { regionId: 'ouagadougou', companyId: 'template', designation: '' },
      select: { code: true, conditionnement: true },
    });
    console.log('   Exemples:', vides.map((v) => `${v.code}/${v.conditionnement}`).join(', '));
  }
  console.log('   Prix négatifs:', prixInvalides);

  // 5. Échantillon
  const sample = await prisma.mercurialeArticle.findMany({
    where: { regionId: 'ouagadougou', companyId: 'template', prix_max: { not: null } },
    take: 3,
    orderBy: { code: 'asc' },
  });
  console.log('\n5. Échantillon (3 articles avec prix):');
  sample.forEach((a) => console.log(`   ${a.code} | ${a.conditionnement} | ${a.prix_max} FCFA`));

  // 6. Résumé
  const ecartNormal = manquants.length === enPlus.length && manquants.length <= 1; // Groupe X recodé
  const ok = (manquants.length === 0 && enPlus.length === 0) || ecartNormal;
  const okQualite = sansDesignation === 0 && prixInvalides === 0;
  console.log('\n6. Statut:', ok && okQualite ? 'OK - Import cohérent' : 'ATTENTION - Vérifier les anomalies ci-dessus');

  console.log('\n=== Fin vérification ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
