/**
 * Corrige les valeurs de prix corrompues dans MercurialeArticle.
 * Les prix > 2^31-1 provoquent une erreur Prisma "Value does not fit in an INT column".
 * Ce script met à NULL les valeurs aberrantes.
 * Usage: node scripts/fix-mercuriale-prices.js
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;

async function main() {
  // SQLite: Prisma crée des tables au nom du modèle (PascalCase)
  for (const col of ['prix_min', 'prix_moyen', 'prix_max']) {
    const r1 = await prisma.$executeRawUnsafe(
      `UPDATE MercurialeArticle SET ${col} = NULL WHERE ${col} > ${INT_MAX}`
    );
    const r2 = await prisma.$executeRawUnsafe(
      `UPDATE MercurialeArticle SET ${col} = NULL WHERE ${col} < ${INT_MIN}`
    );
    console.log(`${col}: ${r1 + r2} ligne(s) corrigée(s)`);
  }
  console.log('Correction terminée.');
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
