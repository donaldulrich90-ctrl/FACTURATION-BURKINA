import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  const where = {};
  if (req.role !== 'super_admin') where.companyId = req.companyId;
  const simulations = await prisma.marcheSimulation.findMany({
    where,
    include: { articles: true, marche: { select: { id: true, reference: true, titre: true, statut: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(simulations);
});

router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const sim = await prisma.marcheSimulation.findFirst({
    where: { id },
    include: { articles: true, marche: true },
  });
  if (!sim) return res.status(404).json({ error: 'Simulation introuvable' });
  if (req.role !== 'super_admin' && sim.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  res.json(sim);
});

function computeTotalDepenses(budgetEnvelope, enregistrementPercent, depenses) {
  const env = Number(budgetEnvelope) || 0;
  const pct = Number(enregistrementPercent) || 0;
  const enregistrement = Math.round(env * pct / 100);
  const autres = Array.isArray(depenses) ? depenses.reduce((s, d) => s + (Number(d.montant) || 0), 0) : 0;
  return enregistrement + autres;
}

router.post('/', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const companyId = req.companyId;
  if (!companyId && req.role !== 'super_admin') return res.status(400).json({ error: 'Entreprise requise' });
  const { reference, titre, entite, budgetEnvelope, enregistrementPercent, depenses, articles } = req.body || {};
  if (!titre) return res.status(400).json({ error: 'Titre requis' });
  const targetCompanyId = companyId || req.body.companyId;
  if (!targetCompanyId) return res.status(400).json({ error: 'Entreprise requise' });

  const totalDepenses = computeTotalDepenses(budgetEnvelope, enregistrementPercent, depenses);

  const sim = await prisma.marcheSimulation.create({
    data: {
      reference: reference || null,
      titre: String(titre).trim(),
      entite: entite ? String(entite).trim() : null,
      budgetEnvelope: budgetEnvelope != null ? Number(budgetEnvelope) : null,
      enregistrementPercent: enregistrementPercent != null ? Number(enregistrementPercent) : null,
      depensesJson: Array.isArray(depenses) ? JSON.stringify(depenses) : '[]',
      totalDepenses,
      companyId: targetCompanyId,
      status: 'brouillon',
      articles: Array.isArray(articles) && articles.length > 0
        ? {
            create: articles.map((a) => ({
              designation: String(a.designation || '').trim(),
              quantity: Math.max(1, Number(a.quantity) || 1),
              prixAchat: Number(a.prixAchat) || 0,
              prixVente: Number(a.prixVente) || 0,
            })),
          }
        : undefined,
    },
    include: { articles: true },
  });
  res.status(201).json(sim);
});

router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const sim = await prisma.marcheSimulation.findFirst({ where: { id } });
  if (!sim) return res.status(404).json({ error: 'Simulation introuvable' });
  if (req.role !== 'super_admin' && sim.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const { reference, titre, entite, budgetEnvelope, enregistrementPercent, depenses, status, articles } = req.body || {};
  const data = {};
  if (reference != null) data.reference = reference ? String(reference).trim() : null;
  if (titre != null) data.titre = String(titre).trim();
  if (entite != null) data.entite = entite ? String(entite).trim() : null;
  if (budgetEnvelope != null) data.budgetEnvelope = Number(budgetEnvelope);
  if (enregistrementPercent != null) data.enregistrementPercent = Number(enregistrementPercent);
  if (depenses !== undefined) data.depensesJson = Array.isArray(depenses) ? JSON.stringify(depenses) : '[]';
  const needsRecalc = budgetEnvelope != null || enregistrementPercent != null || depenses !== undefined;
  if (needsRecalc) {
    const deps = depenses !== undefined ? depenses : (sim.depensesJson ? JSON.parse(sim.depensesJson) : []);
    data.totalDepenses = computeTotalDepenses(
      budgetEnvelope ?? sim.budgetEnvelope,
      enregistrementPercent ?? sim.enregistrementPercent,
      deps
    );
  }
  if (status != null && ['brouillon', 'enregistre'].includes(status)) data.status = status;

  if (articles !== undefined && Array.isArray(articles)) {
    await prisma.marcheSimulationArticle.deleteMany({ where: { simulationId: id } });
    if (articles.length > 0) {
      await prisma.marcheSimulationArticle.createMany({
        data: articles.map((a) => ({
          simulationId: id,
          designation: String(a.designation || '').trim(),
          quantity: Math.max(1, Number(a.quantity) || 1),
          prixAchat: Number(a.prixAchat) || 0,
          prixVente: Number(a.prixVente) || 0,
        })),
      });
    }
  }

  const updated = await prisma.marcheSimulation.findUnique({
    where: { id },
    include: { articles: true, marche: true },
  });
  res.json(updated);
});

/** Enregistrer la simulation et créer le marché associé */
router.post('/:id/enregistrer', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const sim = await prisma.marcheSimulation.findFirst({ where: { id }, include: { articles: true } });
  if (!sim) return res.status(404).json({ error: 'Simulation introuvable' });
  if (req.role !== 'super_admin' && sim.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  if (sim.marcheId) {
    await prisma.marcheSimulation.update({
      where: { id },
      data: { status: 'enregistre' },
      include: { articles: true, marche: true },
    });
    const updated = await prisma.marcheSimulation.findUnique({
      where: { id },
      include: { articles: true, marche: true },
    });
    return res.json(updated);
  }

  const marche = await prisma.marche.create({
    data: {
      reference: sim.reference || `SIM-${Date.now()}`,
      titre: sim.titre,
      entite: sim.entite,
      budgetEstime: sim.budgetEnvelope,
      statut: 'prospective',
      companyId: sim.companyId,
    },
  });
  await prisma.marcheSimulation.update({
    where: { id },
    data: { marcheId: marche.id, status: 'enregistre' },
  });
  const updated = await prisma.marcheSimulation.findUnique({
    where: { id },
    include: { articles: true, marche: true },
  });
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const sim = await prisma.marcheSimulation.findFirst({ where: { id } });
  if (!sim) return res.status(404).json({ error: 'Simulation introuvable' });
  if (req.role !== 'super_admin' && sim.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  await prisma.marcheSimulation.delete({ where: { id } });
  res.status(204).send();
});

export default router;
