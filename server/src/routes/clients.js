import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.companyId;
  if (!companyId && req.role !== 'super_admin') {
    return res.status(400).json({ error: 'Entreprise requise' });
  }
  const where = req.role === 'super_admin' ? {} : { companyId };
  const clients = await prisma.client.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  res.json(clients);
});

router.post('/', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const companyId = req.companyId;
  if (!companyId && req.role !== 'super_admin') {
    return res.status(400).json({ error: 'Entreprise requise' });
  }
  const { name, direction, ifu, rccm, address } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nom du client requis' });
  }
  const targetCompanyId = companyId || req.body.companyId;
  if (!targetCompanyId) return res.status(400).json({ error: 'Entreprise requise' });
  const client = await prisma.client.upsert({
    where: {
      companyId_name: { companyId: targetCompanyId, name: name.trim() },
    },
    create: {
      companyId: targetCompanyId,
      name: name.trim(),
      direction: direction?.trim() || null,
      ifu: ifu?.trim() || null,
      rccm: rccm?.trim() || null,
      address: address?.trim() || null,
    },
    update: {
      direction: direction?.trim() ?? undefined,
      ifu: ifu?.trim() ?? undefined,
      rccm: rccm?.trim() ?? undefined,
      address: address?.trim() ?? undefined,
    },
  });
  res.status(201).json(client);
});

export default router;
