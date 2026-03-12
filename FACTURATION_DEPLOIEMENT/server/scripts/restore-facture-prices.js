/**
 * Restaure les prix d'une facture à partir d'une facture source (même client, articles similaires).
 * Usage: node scripts/restore-facture-prices.js <factureId|numero> [sourceFactureId|numero]
 *
 * Ex: node scripts/restore-facture-prices.js PRO-2026-0001 PRO-2026-0025
 *     Restaure les prix de PRO-2026-0001 en copiant depuis PRO-2026-0025
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeDesignation(s) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function similarity(a, b) {
  const an = normalizeDesignation(a);
  const bn = normalizeDesignation(b);
  if (an === bn) return 100;
  if (an.includes(bn) || bn.includes(an)) return 80;
  const wordsA = new Set(an.split(/\s+/).filter((w) => w.length > 2));
  const wordsB = new Set(bn.split(/\s+/).filter((w) => w.length > 2));
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  return Math.round((common / Math.max(wordsA.size, wordsB.size)) * 60);
}

function matchItems(targetItems, sourceItems) {
  const result = [];
  for (let i = 0; i < targetItems.length; i++) {
    const target = targetItems[i];
    let best = null;
    let bestScore = 0;
    for (let j = 0; j < sourceItems.length; j++) {
      const src = sourceItems[j];
      let score = similarity(target.designation, src.designation);
      if (i === j) score += 15;
      if (score > bestScore) {
        bestScore = score;
        best = src;
      }
    }
    result.push({ target, source: bestScore >= 35 ? best : null });
  }
  return result;
}

async function main() {
  const [targetRef, sourceRef] = process.argv.slice(2);
  if (!targetRef) {
    console.log('Usage: node scripts/restore-facture-prices.js <factureId|numero> [sourceFactureId|numero]');
    console.log('Ex: node scripts/restore-facture-prices.js PRO-2026-0001 PRO-2026-0025');
    process.exit(1);
  }

  const targetFacture = await prisma.facture.findFirst({
    where: targetRef.length > 15 ? { id: targetRef } : { numero: targetRef },
    include: { items: true },
  });

  if (!targetFacture) {
    console.error(`Facture cible "${targetRef}" introuvable.`);
    process.exit(1);
  }

  let sourceFacture = null;
  if (sourceRef) {
    sourceFacture = await prisma.facture.findFirst({
      where: sourceRef.length > 15 ? { id: sourceRef } : { numero: sourceRef },
      include: { items: true },
    });
    if (!sourceFacture) {
      console.error(`Facture source "${sourceRef}" introuvable.`);
      process.exit(1);
    }
  } else {
    // Chercher une facture du même client avec des prix
    const candidates = await prisma.facture.findMany({
      where: {
        client: targetFacture.client,
        id: { not: targetFacture.id },
        totalHT: { gt: 0 },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    sourceFacture = candidates[0];
    if (!sourceFacture) {
      console.error('Aucune facture source trouvée pour ce client avec des prix.');
      process.exit(1);
    }
    console.log(`Source automatique: ${sourceFacture.numero}`);
  }

  const matches = matchItems(targetFacture.items, sourceFacture.items);
  const updates = [];
  let restored = 0;

  for (const { target, source } of matches) {
    if (source && source.priceUnit > 0 && target.priceUnit === 0) {
      updates.push({
        id: target.id,
        priceUnit: source.priceUnit,
        total: source.priceUnit * target.quantity,
        designation: target.designation,
      });
      restored++;
    }
  }

  if (updates.length === 0) {
    console.log('Aucun prix à restaurer (déjà corrects ou pas de correspondance).');
    return;
  }

  console.log(`\nRestauration de ${restored} article(s) pour ${targetFacture.numero}...\n`);

  for (const u of updates) {
    await prisma.factureItem.update({
      where: { id: u.id },
      data: { priceUnit: u.priceUnit, total: u.total },
    });
    console.log(`  ✓ ${u.designation?.slice(0, 45)} → P.U. ${u.priceUnit?.toLocaleString('fr-FR')} FCFA`);
  }

  const allItems = await prisma.factureItem.findMany({ where: { factureId: targetFacture.id } });
  const totalHT = allItems.reduce((s, i) => s + (i.total || 0), 0);
  const tva = Math.round(totalHT * 0.18);
  const totalTTC = totalHT + tva;

  await prisma.facture.update({
    where: { id: targetFacture.id },
    data: { totalHT, tva, totalTTC, netAPayer: totalTTC },
  });

  console.log(`\n✅ Facture ${targetFacture.numero} restaurée : Total HT ${totalHT.toLocaleString('fr-FR')} | TTC ${totalTTC.toLocaleString('fr-FR')} FCFA`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
