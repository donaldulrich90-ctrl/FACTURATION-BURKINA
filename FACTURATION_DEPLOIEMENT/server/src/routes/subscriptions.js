import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { expireSubscriptions } from '../services/subscriptionExpire.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, requireRole('super_admin'), async (_req, res) => {
  await expireSubscriptions().catch(() => {});
  const subscriptions = await prisma.subscription.findMany({
    include: { company: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const totalGains = subscriptions
    .filter((s) => s.status === 'active' || s.status === 'expired')
    .reduce((sum, s) => sum + (s.priceAmount ?? 0), 0);
  res.json({ subscriptions, totalGains });
});

router.patch('/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;
  const { planName, planType, status, endDate, price, priceAmount } = req.body || {};
  const sub = await prisma.subscription.findFirst({ where: { id } });
  if (!sub) return res.status(404).json({ error: 'Abonnement introuvable' });
  const data = {};
  if (planName != null) data.planName = String(planName);
  if (planType != null) data.planType = String(planType);
  if (status != null && ['active', 'expired', 'cancelled'].includes(status)) data.status = status;
  if (endDate != null) data.endDate = new Date(endDate);
  if (price != null) data.price = String(price);
  if (priceAmount != null) data.priceAmount = Number(priceAmount);
  const updated = await prisma.subscription.update({
    where: { id },
    data,
    include: { company: { select: { id: true, name: true, email: true } } },
  });
  res.json(updated);
});

export default router;
