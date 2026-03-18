/**
 * Synchronise les entreprises locales ET leurs données (clients, marchés, factures, quittances)
 * vers la plateforme en ligne.
 *
 * Usage:
 *   cd server
 *   node scripts/sync-entreprises-donnees-to-online.js
 *
 * Variables d'environnement : ONLINE_URL, JWT_TOKEN (voir SYNC_MERCURIALE_EN_LIGNE.md)
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
  console.error('❌ ONLINE_URL et JWT_TOKEN requis dans server/.env');
  process.exit(1);
}

const prisma = new PrismaClient();
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${JWT_TOKEN}`,
};

async function fetchApi(path, options = {}) {
  const res = await fetch(`${ONLINE_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function postApi(path, body) {
  return fetchApi(path, { method: 'POST', body: JSON.stringify(body) });
}

async function verifyToken() {
  const res = await fetch(`${ONLINE_URL}/api/companies`, { headers });
  if (res.status === 401) {
    console.error('❌ Token invalide ou expiré. Reconnectez-vous en ligne et récupérez un nouveau token.');
    process.exit(1);
  }
}

async function getOnlineCompanies() {
  return fetchApi('/api/companies');
}

async function createCompanyOnline(company) {
  const sub = company.subscriptions?.[0];
  const planType = sub?.planType || 'standard';
  const adminUser = company.users?.find((u) => u.role === 'company_admin') || company.users?.[0];
  const adminName = adminUser?.name || company.name;
  const adminEmail = adminUser?.email || company.email;

  return postApi('/api/companies', {
    name: company.name,
    email: company.email,
    phone: company.phone || undefined,
    adminName,
    adminEmail,
    adminPassword: TEMP_PASSWORD,
    planType,
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Synchronisation entreprises + données → en ligne');
  console.log('═══════════════════════════════════════════════════\n');

  await verifyToken();
  console.log('✓ Token valide\n');

  const localCompanies = await prisma.company.findMany({
    where: { id: { not: 'template' } },
    include: {
      subscriptions: { take: 1, orderBy: { endDate: 'desc' } },
      users: { orderBy: { role: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (localCompanies.length === 0) {
    console.log('⚠️  Aucune entreprise trouvée en local (hors template).');
    process.exit(0);
  }

  const onlineCompanies = await getOnlineCompanies();
  const byEmail = new Map(onlineCompanies.map((c) => [c.email?.toLowerCase(), c]));

  const companyMap = new Map();
  for (const c of localCompanies) {
    const existing = byEmail.get(c.email?.toLowerCase());
    if (existing) {
      companyMap.set(c.id, { online: existing, created: false });
      console.log(`   ⏭ ${c.name} — déjà en ligne`);
    } else {
      try {
        const created = await createCompanyOnline(c);
        companyMap.set(c.id, { online: created, created: true });
        console.log(`   ✓ ${c.name} — créée`);
      } catch (e) {
        if (e.message?.includes('déjà utilisé') || e.message?.includes('email')) {
          const found = onlineCompanies.find((x) => x.email?.toLowerCase() === c.email?.toLowerCase());
          if (found) companyMap.set(c.id, { online: found, created: false });
          console.log(`   ⏭ ${c.name} — déjà en ligne (ignoré)`);
        } else {
          console.error(`   ✗ ${c.name}: ${e.message}`);
        }
      }
    }
  }

  console.log('\n📤 Synchronisation des données par entreprise...\n');

  for (const local of localCompanies) {
    const entry = companyMap.get(local.id);
    if (!entry) continue;

    const onlineCompany = entry.online;
    const onlineCompanyId = onlineCompany.id;
    const adminUser = onlineCompany.users?.find((u) => u.role === 'company_admin') || onlineCompany.users?.[0];
    const adminUserId = adminUser?.id;

    if (!adminUserId) {
      console.log(`   ⚠ ${local.name}: pas d'admin trouvé, données non synchronisées`);
      continue;
    }

    let clientsCount = 0;
    let marchesCount = 0;
    let facturesCount = 0;
    let quittancesCount = 0;

    try {
      const clients = await prisma.client.findMany({ where: { companyId: local.id } });
      for (const cl of clients) {
        try {
          await postApi('/api/clients', {
            companyId: onlineCompanyId,
            name: cl.name,
            direction: cl.direction || undefined,
            ifu: cl.ifu || undefined,
            rccm: cl.rccm || undefined,
            address: cl.address || undefined,
          });
          clientsCount++;
        } catch (e) {
          if (!e.message?.includes('déjà')) console.warn(`      Client ${cl.name}: ${e.message}`);
        }
      }

      const marches = await prisma.marche.findMany({
        where: { companyId: local.id },
        include: { depenses: true },
        orderBy: { createdAt: 'asc' },
      });
      const marcheIdMap = new Map();
      for (const m of marches) {
        try {
          const created = await postApi('/api/marches', {
            companyId: onlineCompanyId,
            reference: m.reference,
            titre: m.titre,
            entite: m.entite || undefined,
            budgetEstime: m.budgetEstime || undefined,
            regionId: m.regionId || undefined,
          });
          marcheIdMap.set(m.id, created.id);
          marchesCount++;
        } catch (e) {
          console.warn(`      Marché ${m.reference}: ${e.message}`);
        }
      }

      const factures = await prisma.facture.findMany({
        where: { companyId: local.id },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      });
      const factureIdMap = new Map();
      for (const f of factures) {
        try {
          const items = (f.items || []).map((i) => ({
            code: i.code,
            designation: i.designation,
            specificationTechnique: i.specificationTechnique,
            quantity: i.quantity,
            qMin: i.qMin,
            qMax: i.qMax,
            unite: i.unite || 'U',
            priceUnit: i.priceUnit,
            price: i.priceUnit,
          }));
          const sourceOnlineId = f.sourceDocumentId ? factureIdMap.get(f.sourceDocumentId) : null;
          const marcheOnlineId = f.marcheId ? marcheIdMap.get(f.marcheId) : null;
          const created = await postApi('/api/factures', {
            companyId: onlineCompanyId,
            userId: adminUserId,
            client: f.client,
            clientDirection: f.clientDirection,
            clientIfu: f.clientIfu,
            clientRccm: f.clientRccm,
            clientAddr: f.clientAddr,
            marcheId: marcheOnlineId || undefined,
            marcheNumero: f.marcheNumero,
            objetMarche: f.objetMarche,
            numBonCommande: f.numBonCommande,
            type: f.type,
            numero: f.numero,
            sourceDocumentId: sourceOnlineId || undefined,
            airsiTaux: f.airsiTaux ?? 0,
            items,
          });
          factureIdMap.set(f.id, created.id);
          facturesCount++;
        } catch (e) {
          console.warn(`      Facture ${f.numero}: ${e.message}`);
        }
      }

      const quittances = await prisma.quittance.findMany({
        where: { companyId: local.id },
        include: { facture: true },
      });
      for (const q of quittances) {
        const factureOnlineId = factureIdMap.get(q.factureId);
        if (!factureOnlineId) continue;
        try {
          await postApi('/api/quittances', {
            factureId: factureOnlineId,
            datePaiement: q.datePaiement,
            montant: q.montant,
            modePaiement: q.modePaiement,
            referenceBancaire: q.referenceBancaire,
            remarques: q.remarques,
            userId: adminUserId,
          });
          quittancesCount++;
        } catch (e) {
          if (!e.message?.includes('déjà')) console.warn(`      Quittance ${q.numero}: ${e.message}`);
        }
      }

      const total = clientsCount + marchesCount + facturesCount + quittancesCount;
      if (total > 0) {
        console.log(`   ✓ ${local.name}: ${clientsCount} client(s), ${marchesCount} marché(s), ${facturesCount} facture(s), ${quittancesCount} quittance(s)`);
      }
    } catch (e) {
      console.error(`   ✗ ${local.name}: ${e.message}`);
    }
  }

  console.log('\n✅ Synchronisation terminée.');
}

main()
  .catch((e) => {
    console.error('Erreur:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
