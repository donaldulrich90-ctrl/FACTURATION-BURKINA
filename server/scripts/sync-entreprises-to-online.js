/**
 * Synchronise les entreprises locales (SQLite) vers la plateforme en ligne (PostgreSQL).
 *
 * Pour chaque entreprise locale (hors template) :
 *   - Crée Company, Subscription, User admin via POST /api/companies
 *   - Copie les mercuriales template vers l'entreprise (fait par l'API)
 *
 * Usage:
 *   cd server
 *   node scripts/sync-entreprises-to-online.js
 *
 * Variables d'environnement (ou dans server/.env) :
 *   ONLINE_URL     = https://facturation-burkina.onrender.com
 *   JWT_TOKEN     = Token Super Admin (voir SYNC_MERCURIALE_EN_LIGNE.md)
 *
 * Mot de passe temporaire : ChangeMe123! (les utilisateurs devront le changer à la 1ère connexion)
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const ONLINE_URL = (process.env.ONLINE_URL || '').replace(/\/$/, '');
const JWT_TOKEN = process.env.JWT_TOKEN || '';
const TEMP_PASSWORD = 'ChangeMe123!';

if (!ONLINE_URL || !JWT_TOKEN) {
  console.error(`
❌ Variables manquantes. Ajoutez dans server/.env :

  ONLINE_URL=https://facturation-burkina.onrender.com
  JWT_TOKEN=votre_token_super_admin

Pour obtenir le token :
  1. Connectez-vous sur la plateforme en ligne (admin@plateforme.com)
  2. F12 → Application → Local Storage → copiez "fasomarches_token"
`);
  process.exit(1);
}

const prisma = new PrismaClient();

async function verifyToken() {
  const url = `${ONLINE_URL}/api/companies`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${JWT_TOKEN}` },
  });
  if (res.status === 401) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error === 'Utilisateur introuvable'
        ? 'Token invalide : reconnectez-vous sur la plateforme en ligne et récupérez un nouveau token (F12 → Local Storage → fasomarches_token)'
        : err.error || 'Token expiré ou invalide. Reconnectez-vous en ligne et récupérez un nouveau token.'
    );
  }
  if (!res.ok) throw new Error(`Vérification échouée: HTTP ${res.status}`);
}

async function createCompanyOnline(company) {
  const url = `${ONLINE_URL}/api/companies`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify({
      name: company.name,
      email: company.email,
      phone: company.phone || undefined,
      adminName: company.adminName,
      adminEmail: company.adminEmail,
      adminPassword: TEMP_PASSWORD,
      planType: company.planType || 'standard',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function main() {
  console.log('📤 Synchronisation entreprises local → en ligne');
  console.log(`   URL: ${ONLINE_URL}`);
  console.log(`   Mot de passe temporaire: ${TEMP_PASSWORD}`);
  console.log('');

  try {
    await verifyToken();
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }

  const companies = await prisma.company.findMany({
    where: { id: { not: 'template' } },
    include: {
      subscriptions: { take: 1, orderBy: { endDate: 'desc' } },
      users: { orderBy: { role: 'asc' } }, // company_admin avant company_user
    },
    orderBy: { createdAt: 'asc' },
  });

  if (companies.length === 0) {
    console.log('⚠️  Aucune entreprise trouvée en local (hors template).');
    process.exit(0);
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const c of companies) {
    const sub = c.subscriptions[0];
    const planType = sub?.planType || 'standard';
    const adminUser = c.users.find((u) => u.role === 'company_admin') || c.users[0];
    const adminName = adminUser?.name || c.name;
    const adminEmail = adminUser?.email || c.email;

    const payload = {
      ...c,
      adminName,
      adminEmail,
      planType,
    };

    try {
      await createCompanyOnline(payload);
      created++;
      console.log(`   ✓ ${c.name} (${c.email})`);
    } catch (e) {
      if (e.message?.includes('déjà utilisé') || e.message?.includes('email')) {
        skipped++;
        console.log(`   ⏭ ${c.name} (${c.email}) — déjà en ligne, ignoré`);
      } else {
        errors++;
        console.error(`   ✗ ${c.name} (${c.email}): ${e.message}`);
      }
    }
  }

  console.log('');
  console.log(`✅ Terminé: ${created} créée(s), ${skipped} ignorée(s), ${errors} erreur(s).`);
  if (created > 0) {
    console.log(`   Les utilisateurs devront changer le mot de passe (${TEMP_PASSWORD}) à la première connexion.`);
  }
}

main()
  .catch((e) => {
    console.error('Erreur:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
