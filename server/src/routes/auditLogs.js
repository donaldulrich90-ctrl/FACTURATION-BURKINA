import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Liste des traces d'audit
// super_admin : toutes les traces
// company_admin : traces de son entreprise
router.get('/', authMiddleware, requireRole('super_admin', 'company_admin'), async (req, res) => {
  const where = {};
  if (req.role === 'company_admin') {
    where.companyId = req.companyId;
  }
  const { limit = 100, offset = 0, entity, action } = req.query || {};
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 200),
      skip: Math.max(0, Number(offset) || 0),
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total });
});

export default router;
