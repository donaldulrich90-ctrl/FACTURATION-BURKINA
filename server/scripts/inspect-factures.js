/**
 * Script pour inspecter les factures dans la base (ex: KOUBRI)
 * Usage: node scripts/inspect-factures.js [recherche]
 * Ex: node scripts/inspect-factures.js KOUBRI
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const search = process.argv[2] || '';

async function main() {
  const where = search
    ? { client: { contains: search } }
    : {};

  const factures = await prisma.facture.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (factures.length === 0) {
    console.log(search ? `Aucune facture trouvée pour "${search}"` : 'Aucune facture en base.');
    return;
  }

  console.log(`\n=== ${factures.length} facture(s) trouvée(s) ===\n`);

  for (const f of factures) {
    console.log(`📄 ${f.numero} | Client: ${f.client}`);
    console.log(`   Type: ${f.type} | Date: ${f.dateFacture?.toISOString?.()?.slice(0, 10)}`);
    console.log(`   Total HT: ${f.totalHT?.toLocaleString('fr-FR')} | TTC: ${f.totalTTC?.toLocaleString('fr-FR')} FCFA`);
    console.log(`   Articles (${f.items?.length || 0}):`);
    if (f.items?.length) {
      for (const it of f.items) {
        const prixOk = it.priceUnit > 0 ? '✓' : '❌ PRIX 0';
        console.log(`      - ${it.designation?.slice(0, 40)} | Qté: ${it.quantity} | P.U.: ${it.priceUnit?.toLocaleString('fr-FR')} ${prixOk}`);

      }
    } else {
      console.log('      (aucun article)');
    }
    console.log('');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
