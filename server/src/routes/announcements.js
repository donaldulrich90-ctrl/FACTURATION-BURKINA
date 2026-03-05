import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = Router();

// Lister les annonces et alertes de l'entreprise (visible par tous les utilisateurs)
router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.companyId;
  if (!companyId) return res.status(403).json({ error: 'Entreprise requise' });
  try {
    const list = await prisma.announcement.findMany({
      where: { companyId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(list);
  } catch (err) {
    console.error('Announcements list:', err);
    res.status(500).json({ error: err?.message || 'Erreur' });
  }
});

// Créer une annonce (gérant / company_admin uniquement)
router.post('/', authMiddleware, requireRole('company_admin'), async (req, res) => {
  const companyId = req.companyId;
  const userId = req.userId;
  if (!companyId) return res.status(403).json({ error: 'Entreprise requise' });
  const { title, content, type = 'info' } = req.body || {};
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Titre requis' });
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Contenu requis' });
  const t = (type || 'info').toLowerCase();
  if (!['info', 'alerte'].includes(t)) return res.status(400).json({ error: 'Type invalide (info ou alerte)' });
  try {
    const ann = await prisma.announcement.create({
      data: {
        companyId,
        createdById: userId,
        title: title.trim(),
        content: content.trim(),
        type: t,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(ann);
  } catch (err) {
    console.error('Announcement create:', err);
    res.status(500).json({ error: err?.message || 'Erreur' });
  }
});

// Supprimer une annonce (gérant uniquement)
router.delete('/:id', authMiddleware, requireRole('company_admin'), async (req, res) => {
  const companyId = req.companyId;
  const { id } = req.params;
  if (!companyId) return res.status(403).json({ error: 'Entreprise requise' });
  try {
    await prisma.announcement.deleteMany({
      where: { id, companyId },
    });
    res.status(204).send();
  } catch (err) {
    console.error('Announcement delete:', err);
    res.status(500).json({ error: err?.message || 'Erreur' });
  }
});

export default router;
