import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { logAudit } from '../services/auditLog.js';

const router = Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join('. ');
    return res.status(400).json({ error: msg });
  }
  next();
}
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && (!JWT_SECRET || JWT_SECRET === 'dev-secret')) {
  console.error('❌ SECURITE: Définissez JWT_SECRET dans .env en production !');
  process.exit(1);
}

router.post('/login',
  body('email').trim().isEmail().withMessage('Email invalide').normalizeEmail(),
  body('password').trim().notEmpty().withMessage('Mot de passe requis').isLength({ max: 200 }).withMessage('Données invalides'),
  handleValidation,
  async (req, res) => {
  try {
    const emailNorm = (req.body.email || '').toLowerCase();
    const passwordStr = String(req.body.password ?? '').trim();

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

    if (!user) {
      await logAudit({ action: 'login_failed', entity: 'auth', details: { email: emailNorm, reason: 'user_not_found' }, ipAddress: req.ip, userAgent: req.headers?.['user-agent'] });
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    const ok = await bcrypt.compare(passwordStr, user.password);
    if (!ok) {
      await logAudit({ userId: user.id, companyId: user.companyId, action: 'login_failed', entity: 'auth', details: { email: emailNorm, reason: 'wrong_password' }, ipAddress: req.ip, userAgent: req.headers?.['user-agent'] });
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const subscription = user.company?.subscriptions?.[0];
    const endDate = subscription ? new Date(subscription.endDate) : null;
    const isExpired = endDate && endDate < new Date() && subscription?.status !== 'cancelled';

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    await logAudit({ userId: user.id, companyId: user.companyId, action: 'login', entity: 'auth', details: { email: user.email }, ipAddress: req.ip, userAgent: req.headers?.['user-agent'] });
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

/** Changer le mot de passe de l'utilisateur connecté */
router.post('/change-password',
  authMiddleware,
  body('currentPassword').trim().notEmpty().withMessage('Mot de passe actuel requis').isLength({ max: 200 }),
  body('newPassword').trim().notEmpty().withMessage('Nouveau mot de passe requis').isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères'),
  handleValidation,
  async (req, res) => {
  try {
    const currentStr = String(req.body.currentPassword ?? '').trim();
    const newStr = String(req.body.newPassword ?? '').trim();

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const ok = await bcrypt.compare(currentStr, user.password);
    if (!ok) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

    const hashed = await bcrypt.hash(newStr, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashed },
    });
    await logAudit({ userId: req.userId, companyId: req.companyId, action: 'update', entity: 'user', entityId: req.userId, details: { field: 'password' }, ipAddress: req.ip, userAgent: req.headers?.['user-agent'] });

    res.json({ ok: true, message: 'Mot de passe modifié avec succès' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
