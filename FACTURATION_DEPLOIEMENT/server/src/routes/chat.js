import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const prisma = new PrismaClient();
const router = Router();

// Messages du canal entreprise (groupe ou conversation privée)
// GET /?receiverId=xxx → conversation 1-to-1 avec cet utilisateur
// GET / → canal groupe (tous les messages receiverId=null)
router.get('/', authMiddleware, async (req, res) => {
  const companyId = req.companyId;
  const userId = req.userId;
  if (!companyId) return res.status(403).json({ error: 'Entreprise requise' });
  const receiverId = req.query.receiverId || null;
  try {
    let where;
    if (receiverId) {
      where = {
        companyId,
        OR: [
          { senderId: userId, receiverId },
          { senderId: receiverId, receiverId: userId },
        ],
      };
    } else {
      where = { companyId, receiverId: null };
    }
    const messages = await prisma.chatMessage.findMany({
      where,
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    res.json(messages);
  } catch (err) {
    console.error('Chat list:', err);
    res.status(500).json({ error: err?.message || 'Erreur' });
  }
});

// Envoyer un message
router.post('/', authMiddleware, async (req, res) => {
  const companyId = req.companyId;
  const userId = req.userId;
  if (!companyId) return res.status(403).json({ error: 'Entreprise requise' });
  const { content, receiverId, type = 'text', metadata } = req.body || {};
  if (!content || typeof content !== 'string') return res.status(400).json({ error: 'Contenu requis' });
  const trimmed = content.trim();
  if (!trimmed) return res.status(400).json({ error: 'Contenu requis' });
  try {
    const msg = await prisma.chatMessage.create({
      data: {
        companyId,
        senderId: userId,
        receiverId: receiverId || null,
        content: trimmed,
        type: type || 'text',
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
      },
    });
    res.status(201).json(msg);
  } catch (err) {
    console.error('Chat send:', err);
    res.status(500).json({ error: err?.message || 'Erreur' });
  }
});

// Utilisateurs de l'entreprise (pour le chat et les appels)
router.get('/users', authMiddleware, async (req, res) => {
  const companyId = req.companyId;
  if (!companyId) return res.status(403).json({ error: 'Entreprise requise' });
  try {
    const users = await prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('Chat users:', err);
    res.status(500).json({ error: err?.message || 'Erreur' });
  }
});

export default router;
