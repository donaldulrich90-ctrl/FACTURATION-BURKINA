/**
 * Affiche les identifiants de connexion pour chaque entreprise (local et en ligne).
 * Utile pour accéder aux comptes synchronisés sur la plateforme en ligne.
 *
 * Usage: node scripts/list-company-credentials.js
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const ONLINE_URL = (process.env.ONLINE_URL || '').replace(/\/$/, '');
const TEMP_PASSWORD = 'ChangeMe123!';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { id: { not: 'template' } },
    include: {
      users: { orderBy: { role: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  if (companies.length === 0) {
    console.log('Aucune entreprise trouvée en local.');
    return;
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('  Identifiants des entreprises synchronisées');
  console.log('═══════════════════════════════════════════════════\n');

  if (ONLINE_URL) {
    console.log(`📍 Plateforme en ligne : ${ONLINE_URL}/login\n`);
  } else {
    console.log('⚠️  Configurez ONLINE_URL dans server/.env pour afficher l\'URL de connexion.\n');
  }

  console.log('Pour vous connecter, utilisez la plateforme EN LIGNE (pas localhost).\n');
  console.log('─'.repeat(55));

  for (const c of companies) {
    const admin = c.users?.find((u) => u.role === 'company_admin') || c.users?.[0];
    const email = admin?.email || c.email;
    console.log(`\nEntreprise : ${c.name}`);
    console.log(`  Email    : ${email}`);
    console.log(`  Mot de passe : ${TEMP_PASSWORD}`);
    console.log(`  (Changer après 1ère connexion)`);
  }

  console.log('\n' + '─'.repeat(55));
  console.log('\n⚠️  IMPORTANT : Connectez-vous sur la plateforme en ligne');
  console.log(`   ${ONLINE_URL || 'https://votre-plateforme.onrender.com'}`);
  console.log('   et non sur localhost.\n');
}

main()
  .catch((e) => {
    console.error('Erreur:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
