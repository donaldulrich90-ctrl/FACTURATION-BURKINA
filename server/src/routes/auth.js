import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailNorm = String(email || '').trim().toLowerCase();
    const passwordStr = String(password ?? '').trim();
    if (!emailNorm || !passwordStr) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await prisma.user.findUnique({
      where: { email: emailNorm },
      include: {
        company: {
          include: {
            subscriptions: { take: 1, orderBy: { endDate: 'desc' } },
          },
        },
      },
    });

    if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    const ok = await bcrypt.compare(passwordStr, user.password);
    if (!ok) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const subscription = user.company?.subscriptions?.[0];
    const endDate = subscription ? new Date(subscription.endDate) : null;
    const isExpired = endDate && endDate < new Date() && subscription?.status !== 'cancelled';

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    const { password: _, ...safeUser } = user;
    res.json({
      token,
      user: {
        ...safeUser,
        isExpired: !!isExpired,
        subscription: subscription || null,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: {
      company: { include: { subscriptions: { take: 1, orderBy: { endDate: 'desc' } } } },
    },
  });
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

export default router;
