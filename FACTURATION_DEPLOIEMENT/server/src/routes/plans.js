import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const FEATURE_IDS = ['facturation', 'mercuriale', 'marches', 'rh', 'comptabilite', 'impots', 'archives', 'appels-offres', 'documents-admin', 'montage-dao', 'suivi'];

const DEFAULTS = [
  { planType: 'gratuit', planName: 'Gratuit (Démo)', price: '0 FCFA', priceAmount: 0, features: ['facturation', 'mercuriale'], displayOrder: 1 },
  { planType: 'standard', planName: 'Standard Annuel', price: '250 000 FCFA/an', priceAmount: 250000, features: ['facturation', 'mercuriale', 'suivi', 'documents-admin'], displayOrder: 2 },
  { planType: 'simulation', planName: 'Simulation & Marchés', price: '450 000 FCFA/an', priceAmount: 450000, features: ['facturation', 'mercuriale', 'marches', 'suivi', 'documents-admin', 'montage-dao', 'appels-offres'], displayOrder: 3 },
  { planType: 'pro', planName: 'Pro Complet', price: '750 000 FCFA/an', priceAmount: 750000, features: ['facturation', 'mercuriale', 'marches', 'rh', 'comptabilite', 'impots', 'suivi', 'documents-admin', 'montage-dao', 'appels-offres'], displayOrder: 4 },
  { planType: 'entreprise', planName: 'Entreprise Illimité', price: '1 500 000 FCFA/an', priceAmount: 1500000, features: FEATURE_IDS, displayOrder: 5 },
];

router.get('/', authMiddleware, requireRole('super_admin'), async (_req, res) => {
  let plans = await prisma.subscriptionPlan.findMany({ orderBy: { displayOrder: 'asc' } });
  if (plans.length === 0) {
    await prisma.subscriptionPlan.createMany({
      data: DEFAULTS.map((p) => ({ ...p, features: JSON.stringify(p.features) })),
    });
    plans = await prisma.subscriptionPlan.findMany({ orderBy: { displayOrder: 'asc' } });
  }
  const withFeatures = plans.map((p) => ({
    ...p,
    features: typeof p.features === 'string' ? (() => { try { return JSON.parse(p.features); } catch { return []; } })() : (p.features || []),
  }));
  res.json(withFeatures);
});

router.get('/feature-ids', authMiddleware, requireRole('super_admin'), (_req, res) => {
  res.json(FEATURE_IDS);
});

router.post('/', authMiddleware, requireRole('super_admin'), async (req, res) => {
  const { planType, planName, price, priceAmount, features, displayOrder } = req.body || {};
  const code = (planType || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!code) return res.status(400).json({ error: 'Code du forfait requis' });
  const existing = await prisma.subscriptionPlan.findUnique({ where: { planType: code } });
  if (existing) return res.status(400).json({ error: 'Un forfait avec ce code existe déjà' });
  const featuresJson = Array.isArray(features) ? JSON.stringify(features) : (typeof features === 'string' ? features : null);
  const maxOrder = await prisma.subscriptionPlan.findFirst({ orderBy: { displayOrder: 'desc' }, select: { displayOrder: true } });
  const order = displayOrder != null ? Number(displayOrder) : (maxOrder?.displayOrder ?? 0) + 1;
  const plan = await prisma.subscriptionPlan.create({
    data: {
      planType: code,
      planName: (planName || code).trim(),
      price: price != null ? String(price).trim() : null,
      priceAmount: Number(priceAmount) || 0,
      features: featuresJson,
      displayOrder: order,
    },
  });
  res.status(201).json({ ...plan, features: featuresJson ? JSON.parse(featuresJson) : [] });
});

router.patch('/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;
  const { planType, planName, price, priceAmount, features, displayOrder } = req.body || {};
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) return res.status(404).json({ error: 'Forfait introuvable' });
  const data = {};
  if (planType != null) data.planType = String(planType).trim().toLowerCase().replace(/\s+/g, '-');
  if (planName != null) data.planName = String(planName).trim();
  if (price != null) data.price = String(price).trim();
  if (priceAmount != null) data.priceAmount = Number(priceAmount) || 0;
  if (features != null) data.features = Array.isArray(features) ? JSON.stringify(features) : (typeof features === 'string' ? features : undefined);
  if (displayOrder != null) data.displayOrder = Number(displayOrder);
  const updated = await prisma.subscriptionPlan.update({ where: { id }, data });
  res.json({ ...updated, features: updated.features ? (() => { try { return JSON.parse(updated.features); } catch { return []; } })() : [] });
});

router.delete('/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) return res.status(404).json({ error: 'Forfait introuvable' });
  await prisma.subscriptionPlan.delete({ where: { id } });
  res.status(204).send();
});

export default router;
export { FEATURE_IDS };
