import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

function genNumeroQuittance() {
  const y = new Date().getFullYear();
  const r = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `QSL-${y}-${r}`;
}

// Liste des quittances (QSL)
router.get('/', authMiddleware, async (req, res) => {
  const where = {};
  if (req.role !== 'super_admin') where.companyId = req.companyId;
  const quittances = await prisma.quittance.findMany({
    where,
    include: {
      facture: { select: { numero: true, client: true, totalTTC: true } },
      user: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(quittances);
});

// Détail quittance
router.get('/:id', authMiddleware, async (req, res) => {
  const q = await prisma.quittance.findUnique({
    where: { id: req.params.id },
    include: {
      facture: { include: { items: true } },
      company: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!q) return res.status(404).json({ error: 'Quittance introuvable' });
  if (req.role !== 'super_admin' && q.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  res.json(q);
});

// Émettre une quittance (QSL) - lors du paiement d'une facture
router.post('/', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const companyId = req.companyId;
  if (!companyId && req.role !== 'super_admin') {
    return res.status(400).json({ error: 'Entreprise requise' });
  }
  const { factureId, datePaiement, montant, modePaiement, referenceBancaire, remarques } = req.body || {};
  if (!factureId || !montant || !modePaiement) {
    return res.status(400).json({ error: 'Facture, montant et mode de paiement requis' });
  }
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { quittance: true },
  });
  if (!facture) return res.status(404).json({ error: 'Facture introuvable' });
  if (facture.quittance) return res.status(400).json({ error: 'Cette facture a déjà une quittance' });
  if (req.role !== 'super_admin' && facture.companyId !== companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const quittance = await prisma.quittance.create({
    data: {
      numero: genNumeroQuittance(),
      factureId,
      datePaiement: datePaiement ? new Date(datePaiement) : new Date(),
      montant: Number(montant),
      modePaiement,
      referenceBancaire: referenceBancaire || null,
      remarques: remarques || null,
      statut: 'emise',
      companyId: facture.companyId,
      userId: req.userId,
    },
    include: {
      facture: { include: { items: true } },
      user: { select: { name: true } },
    },
  });
  await prisma.facture.update({
    where: { id: factureId },
    data: { statut: 'payee' },
  });
  res.status(201).json(quittance);
});

export default router;
