/**
 * Synchronise les mercuriales locales (SQLite) vers la plateforme en ligne (PostgreSQL).
 *
 * Usage:
 *   cd server
 *   node scripts/sync-mercuriale-to-online.js
 *
 * Variables d'environnement (ou dans server/.env) :
 *   ONLINE_URL     = https://fasomarche.duckdns.org (URL de la plateforme en ligne)
 *   JWT_TOKEN     = Token Super Admin (voir ci-dessous comment l'obtenir)
 *
 * Comment obtenir le JWT_TOKEN :
 *   1. Connectez-vous sur la plateforme en ligne (admin@plateforme.com / admin123)
 *   2. Ouvrez les outils développeur (F12) → Application → Local Storage
 *   3. Copiez la valeur de "fasomarches_token"
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const ONLINE_URL = (process.env.ONLINE_URL || '').replace(/\/$/, '');
const JWT_TOKEN = process.env.JWT_TOKEN || '';

if (!ONLINE_URL || !JWT_TOKEN) {
  console.error(`
❌ Variables manquantes. Ajoutez dans server/.env :

  ONLINE_URL=https://fasomarche.duckdns.org
  JWT_TOKEN=votre_token_super_admin

Pour obtenir le token :
  1. Connectez-vous sur la plateforme en ligne (admin@plateforme.com)
  2. F12 → Application → Local Storage → copiez "fasomarches_token"
`);
  process.exit(1);
}

const prisma = new PrismaClient();

function toLine(art) {
  return {
    code: art.code,
    designation: art.designation || '',
    conditionnement: art.conditionnement || 'Unité',
    categorie: art.categorie || 'Divers',
    type: art.type || 'article',
    prix_min: art.prix_min ?? null,
    prix_moyen: art.prix_moyen ?? null,
    prix_max: art.prix_max ?? null,
  };
}

async function pushRegion(regionId, lines) {
  const url = `${ONLINE_URL}/api/mercuriale/${regionId}/replace`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify({ lines }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.replaced ?? lines.length;
}

async function main() {
  console.log('📤 Synchronisation mercuriale local → en ligne');
  console.log(`   URL: ${ONLINE_URL}`);
  console.log('');

  const articles = await prisma.mercurialeArticle.findMany({
    where: { companyId: 'template' },
    orderBy: [{ regionId: 'asc' }, { code: 'asc' }],
  });

  const byRegion = new Map();
  for (const a of articles) {
    if (!byRegion.has(a.regionId)) byRegion.set(a.regionId, []);
    byRegion.get(a.regionId).push(toLine(a));
  }

  if (byRegion.size === 0) {
    console.log('⚠️  Aucune mercuriale trouvée en local (companyId=template).');
    console.log('   Importez d\'abord des mercuriales via l\'onglet Super Admin.');
    process.exit(0);
  }

  let total = 0;
  for (const [regionId, lines] of byRegion) {
    try {
      const count = await pushRegion(regionId, lines);
      total += count;
      console.log(`   ✓ ${regionId}: ${count} article(s)`);
    } catch (e) {
      console.error(`   ✗ ${regionId}: ${e.message}`);
    }
  }

  console.log('');
  console.log(`✅ Terminé: ${total} article(s) synchronisé(s) vers la plateforme en ligne.`);
}

main()
  .catch((e) => {
    console.error('Erreur:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
