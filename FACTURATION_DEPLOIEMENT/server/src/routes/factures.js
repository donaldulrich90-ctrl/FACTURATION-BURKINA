import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const PREFIXES = { proforma: 'PRO', definitive: 'FAC', bl: 'BL', spec_tech: 'SPEC' };

async function genNumero(prisma, type = 'proforma') {
  const prefix = PREFIXES[type] || 'FAC';
  const y = new Date().getFullYear();
  const pattern = `${prefix}-${y}-`;
  const last = await prisma.facture.findFirst({
    where: { numero: { startsWith: pattern } },
    orderBy: { createdAt: 'desc' },
  });
  const seq = last ? parseInt(last.numero.split('-')[2] || '0') + 1 : 1;
  return `${prefix}-${y}-${String(seq).padStart(4, '0')}`;
}

router.get('/', authMiddleware, async (req, res) => {
  const where = {};
  if (req.role !== 'super_admin') where.companyId = req.companyId;
  const factures = await prisma.facture.findMany({
    where,
    include: {
      items: true,
      user: { select: { name: true, email: true } },
      sourceDocument: { select: { id: true, numero: true, type: true } },
      quittance: { select: { id: true, numero: true, datePaiement: true, montant: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  res.json(factures);
});

router.get('/proformas', authMiddleware, async (req, res) => {
  const where = { type: 'proforma' };
  if (req.role !== 'super_admin') where.companyId = req.companyId;
  const list = await prisma.facture.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(list);
});

router.get('/definitives', authMiddleware, async (req, res) => {
  const where = { type: 'definitive' };
  if (req.role !== 'super_admin') where.companyId = req.companyId;
  const list = await prisma.facture.findMany({
    where,
    include: { items: true, sourceDocument: { select: { numero: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(list);
});

router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const where = { id };
  if (req.role !== 'super_admin') where.companyId = req.companyId;
  const f = await prisma.facture.findFirst({
    where,
    include: { items: true, user: { select: { name: true, email: true } } },
  });
  if (!f) return res.status(404).json({ error: 'Facture introuvable' });
  const items = (f.items || []).map((it) => ({
    id: it.id,
    code: it.code,
    designation: it.designation,
    specificationTechnique: it.specificationTechnique,
    quantity: it.quantity,
    qMin: it.qMin,
    qMax: it.qMax,
    unite: it.unite,
    priceUnit: it.priceUnit,
    total: it.total,
  }));
  const payload = { ...f, items };
  res.json(payload);
});

router.post('/', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const companyId = req.companyId;
  if (!companyId && req.role !== 'super_admin') {
    return res.status(400).json({ error: 'Entreprise requise' });
  }
  const {
    client, clientDirection, clientIfu, clientRccm, clientAddr,
    companyId: bodyCompanyId, marcheId, marcheNumero, objetMarche, numBonCommande,
    airsiTaux = 0, items: itemsRaw, type = 'proforma', sourceDocumentId, numero: numeroBody,
  } = req.body || {};
  if (!client || !Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    return res.status(400).json({ error: 'Client et au moins un article requis' });
  }
  const targetCompanyId = companyId || (req.role === 'super_admin' ? bodyCompanyId : null);
  if (!targetCompanyId) return res.status(400).json({ error: 'Entreprise requise' });
  const totalHT = itemsRaw.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.priceUnit) || Number(i.price) || 0), 0);
  const tva = Math.round(totalHT * 0.18);
  const totalTTC = totalHT + tva;
  const airsi = Math.round(totalTTC * (Number(airsiTaux) || 0) / 100);
  const netAPayer = totalTTC - airsi;
  const docType = ['proforma', 'definitive', 'bl', 'spec_tech'].includes(type) ? type : 'proforma';
  let numero = (numeroBody && typeof numeroBody === 'string' && numeroBody.trim()) ? numeroBody.trim() : null;
  if (!numero) numero = await genNumero(prisma, docType);
  const facture = await prisma.facture.create({
    data: {
      numero,
      type: docType,
      sourceDocumentId: sourceDocumentId || null,
      client,
      clientDirection: clientDirection || null,
      clientIfu: clientIfu || null,
      clientRccm: clientRccm || null,
      clientAddr: clientAddr || null,
      marcheNumero: marcheNumero || null,
      objetMarche: objetMarche || null,
      numBonCommande: numBonCommande || null,
      totalHT,
      tva,
      airsiTaux: Number(airsiTaux) || 0,
      airsi,
      totalTTC,
      netAPayer,
      statut: 'brouillon',
      companyId: targetCompanyId,
      userId: req.userId,
      marcheId: marcheId || null,
      items: {
        create: itemsRaw.map((i) => {
          const qty = Number(i.quantity) || 1;
          const pu = Number(i.priceUnit) || Number(i.price) || 0;
          const qMin = i.qMin != null ? Number(i.qMin) : qty;
          const qMax = i.qMax != null ? Number(i.qMax) : qty;
          return {
            code: i.code?.trim() || null,
            designation: i.designation || '',
            specificationTechnique: i.specificationTechnique?.trim() || null,
            quantity: qty,
            qMin: Number.isFinite(qMin) ? qMin : null,
            qMax: Number.isFinite(qMax) ? qMax : null,
            unite: ['U', 'Lot', 'Forfait'].includes(i.unite) ? i.unite : 'U',
            priceUnit: pu,
            total: qty * pu,
          };
        }),
      },
    },
    include: { items: true },
  });

  // Enregistrer le client dans le carnet d'adresses pour les prochaines factures
  const clientName = (client || '').trim();
  if (clientName) {
    try {
      await prisma.client.upsert({
        where: {
          companyId_name: { companyId: targetCompanyId, name: clientName },
        },
        create: {
          companyId: targetCompanyId,
          name: clientName,
          direction: clientDirection || null,
          ifu: clientIfu || null,
          rccm: clientRccm || null,
          address: clientAddr || null,
        },
        update: {
          direction: clientDirection || undefined,
          ifu: clientIfu || undefined,
          rccm: clientRccm || undefined,
          address: clientAddr || undefined,
        },
      });
    } catch (e) {
      console.warn('Client non enregistré:', e.message);
    }
  }

  res.status(201).json(facture);
});

router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const f = await prisma.facture.findFirst({ where: { id }, include: { items: true } });
  if (!f) return res.status(404).json({ error: 'Facture introuvable' });
  if (req.role !== 'super_admin' && f.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }

  const {
    type: typeBody, sourceDocumentId: sourceDocId,
    marcheId, client, clientDirection, clientIfu, clientRccm, clientAddr,
    marcheNumero, objetMarche, numBonCommande, airsiTaux = 0, items: itemsRaw, numero: numeroBody,
  } = req.body || {};

  const data = {};
  const canEdit = f.statut !== 'payee';
  if (marcheId !== undefined) data.marcheId = marcheId || null;
  if (canEdit && typeBody && ['proforma', 'definitive', 'bl', 'spec_tech'].includes(typeBody)) data.type = typeBody;
  if (canEdit && sourceDocId !== undefined) data.sourceDocumentId = sourceDocId || null;
  if (canEdit && numeroBody != null && typeof numeroBody === 'string' && numeroBody.trim()) {
    const existing = await prisma.facture.findUnique({ where: { numero: numeroBody.trim() } });
    if (!existing || existing.id === f.id) data.numero = numeroBody.trim();
  }

  if (canEdit && (client != null || itemsRaw != null)) {
    if (client != null) {
      data.client = client;
      if (clientDirection !== undefined) data.clientDirection = clientDirection || null;
      if (clientIfu !== undefined) data.clientIfu = clientIfu || null;
      if (clientRccm !== undefined) data.clientRccm = clientRccm || null;
      if (clientAddr !== undefined) data.clientAddr = clientAddr || null;
    }
    if (marcheNumero !== undefined) data.marcheNumero = marcheNumero || null;
    if (objetMarche !== undefined) data.objetMarche = objetMarche || null;
    if (numBonCommande !== undefined) data.numBonCommande = numBonCommande || null;
    if (airsiTaux !== undefined) data.airsiTaux = Number(airsiTaux) || 0;

    if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
      const totalHT = itemsRaw.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.priceUnit) || Number(i.price) || 0), 0);
      const tva = Math.round(totalHT * 0.18);
      const totalTTC = totalHT + tva;
      const airsi = Math.round(totalTTC * (Number(airsiTaux) || data.airsiTaux || 0) / 100);
      data.totalHT = totalHT;
      data.tva = tva;
      data.totalTTC = totalTTC;
      data.airsi = airsi;
      data.netAPayer = totalTTC - airsi;

      await prisma.factureItem.deleteMany({ where: { factureId: id } });
      await prisma.factureItem.createMany({
        data: itemsRaw.map((i) => {
          const qty = Number(i.quantity) || 1;
          const pu = Number(i.priceUnit) || Number(i.price) || 0;
          const qMin = i.qMin != null ? Number(i.qMin) : qty;
          const qMax = i.qMax != null ? Number(i.qMax) : qty;
          return {
            factureId: id,
            code: i.code?.trim() || null,
            designation: i.designation || '',
            specificationTechnique: i.specificationTechnique?.trim() || null,
            quantity: qty,
            qMin: Number.isFinite(qMin) ? qMin : null,
            qMax: Number.isFinite(qMax) ? qMax : null,
            unite: ['U', 'Lot', 'Forfait'].includes(i.unite) ? i.unite : 'U',
            priceUnit: pu,
            total: qty * pu,
          };
        }),
      });
    }
  }

  const updated = await prisma.facture.update({
    where: { id },
    data,
    include: { items: true, quittance: true, marche: { select: { id: true, reference: true, titre: true } } },
  });
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const f = await prisma.facture.findFirst({ where: { id }, include: { quittance: true } });
  if (!f) return res.status(404).json({ error: 'Facture introuvable' });
  if (req.role !== 'super_admin' && f.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  if (f.statut === 'payee') {
    return res.status(400).json({ error: 'Impossible de supprimer une facture déjà payée.' });
  }
  try {
    if (f.quittance) await prisma.quittance.delete({ where: { id: f.quittance.id } });
    await prisma.facture.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erreur lors de la suppression' });
  }
});

const STATUTS_FACTURE = ['brouillon', 'envoyee', 'en_cours_daf', 'validee_daf', 'en_cours_tresor', 'payee'];

router.patch('/:id/statut', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { statut } = req.body || {};
  if (!STATUTS_FACTURE.includes(statut)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }
  const f = await prisma.facture.findFirst({ where: { id }, include: { quittance: true } });
  if (!f) return res.status(404).json({ error: 'Facture introuvable' });
  if (req.role !== 'super_admin' && f.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const updated = await prisma.facture.update({
    where: { id },
    data: { statut },
    include: { items: true, quittance: true },
  });
  res.json(updated);
});

export default router;
