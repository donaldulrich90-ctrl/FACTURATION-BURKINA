import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, requireRole('super_admin'), async (_req, res) => {
  const companies = await prisma.company.findMany({
    include: {
      subscriptions: { take: 1, orderBy: { endDate: 'desc' } },
      users: { select: { id: true, name: true, email: true, phone: true, role: true, assignedTasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(companies);
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

router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: { subscriptions: true, users: { select: { id: true, name: true, email: true, phone: true, role: true, assignedTasks: true } } },
  });
  if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });
  if (req.role !== 'super_admin' && company.id !== req.companyId) return res.status(403).json({ error: 'Accès refusé' });
  res.json(company);
});

router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });
  if (req.role !== 'super_admin' && company.id !== req.companyId) return res.status(403).json({ error: 'Accès refusé' });
  const { name, phone, ifu, rccm, address, regimeFiscal, contact, gerant, logoUrl, signatureUrl, cachetUrl, website } = req.body || {};
  const data = {};
  if (name != null) data.name = String(name).trim();
  if (phone != null) data.phone = phone ? String(phone).trim() : null;
  if (ifu != null) data.ifu = ifu ? String(ifu).trim() : null;
  if (rccm != null) data.rccm = rccm ? String(rccm).trim() : null;
  if (address != null) data.address = address ? String(address).trim() : null;
  if (regimeFiscal != null) data.regimeFiscal = regimeFiscal ? String(regimeFiscal).trim() : null;
  if (contact != null) data.contact = contact ? String(contact).trim() : null;
  if (gerant != null) data.gerant = gerant ? String(gerant).trim() : null;
  if (logoUrl != null) data.logoUrl = logoUrl ? String(logoUrl).trim() : null;
  if (signatureUrl != null) data.signatureUrl = signatureUrl ? String(signatureUrl).trim() : null;
  if (cachetUrl != null) data.cachetUrl = cachetUrl ? String(cachetUrl).trim() : null;
  if (website != null) data.website = website ? String(website).trim() : null;
  const updated = await prisma.company.update({
    where: { id },
    data,
    include: { subscriptions: true, users: { select: { id: true, name: true, email: true, phone: true, role: true, assignedTasks: true } } },
  });
  res.json(updated);
});

router.delete('/:id', authMiddleware, requireRole('super_admin'), async (req, res) => {
  const { id } = req.params;
  if (id === 'template') return res.status(400).json({ error: 'Impossible de supprimer la mercuriale de référence.' });
  try {
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company) return res.status(404).json({ error: 'Entreprise introuvable' });
    await prisma.company.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('Erreur suppression entreprise:', err);
    res.status(500).json({ error: err?.message || 'Erreur lors de la suppression.' });
  }
});

router.patch('/:companyId/users/:userId', authMiddleware, requireRole('super_admin', 'company_admin'), async (req, res) => {
  const { companyId, userId } = req.params;
  if (req.role === 'company_admin' && companyId !== req.companyId) return res.status(403).json({ error: 'Accès refusé' });
  const { name, phone, role, assignedTasks, password } = req.body || {};
  const data = {};
  if (name != null) data.name = String(name).trim();
  if (phone != null) data.phone = phone ? String(phone).trim() : null;
  if (role != null && ['company_admin', 'company_user'].includes(role)) data.role = role;
  if (password != null && String(password).trim().length >= 4) {
    data.password = await bcrypt.hash(String(password).trim(), 10);
  }
  if (assignedTasks != null) {
    data.assignedTasks = Array.isArray(assignedTasks) ? JSON.stringify(assignedTasks) : (typeof assignedTasks === 'string' ? assignedTasks : null);
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
  const user = await prisma.user.updateMany({
    where: { id: userId, companyId },
    data,
  });
  if (user.count === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const updated = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, phone: true, role: true, assignedTasks: true } });
  res.json(updated);
});

router.delete('/:companyId/users/:userId', authMiddleware, requireRole('super_admin', 'company_admin'), async (req, res) => {
  const { companyId, userId } = req.params;
  if (req.role === 'company_admin' && companyId !== req.companyId) return res.status(403).json({ error: 'Accès refusé' });
  await prisma.user.deleteMany({ where: { id: userId, companyId } });
  res.status(204).send();
});

// Fallback si aucun plan paramétré en base
const DEFAULT_PLAN = {
  planName: 'Standard Annuel',
  price: '250 000 FCFA/an',
  priceAmount: 250000,
  features: ['facturation', 'mercuriale', 'suivi', 'documents-admin'],
};

router.post('/', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const { name, email, phone, adminName, adminEmail, adminPassword, planType } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'Nom et email requis' });
    const planTypeCode = (planType || 'standard').toString().trim().toLowerCase();
    const dbPlan = await prisma.subscriptionPlan.findUnique({ where: { planType: planTypeCode } });
    const planConfig = dbPlan
      ? {
          planName: dbPlan.planName,
          price: dbPlan.price || DEFAULT_PLAN.price,
          priceAmount: dbPlan.priceAmount ?? DEFAULT_PLAN.priceAmount,
          features: dbPlan.features ? (() => { try { return JSON.parse(dbPlan.features); } catch { return DEFAULT_PLAN.features; } })() : DEFAULT_PLAN.features,
        }
      : DEFAULT_PLAN;
    const emailNorm = email.trim().toLowerCase();
    const adminEmailNorm = (adminEmail || email).trim().toLowerCase();

    const company = await prisma.company.create({
      data: { name, email: emailNorm, phone: phone || null },
    });
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    const featuresJson = Array.isArray(planConfig.features) ? JSON.stringify(planConfig.features) : null;
    await prisma.subscription.create({
      data: {
        companyId: company.id,
        planName: planConfig.planName,
        planType: planTypeCode,
        startDate: new Date(),
        endDate: end,
        status: 'active',
        price: planConfig.price,
        priceAmount: planConfig.priceAmount,
        features: featuresJson,
      },
    });
    if (adminName && adminEmail && adminPassword) {
      const pw = String(adminPassword).trim();
      if (pw.length >= 4) {
        const hashed = await bcrypt.hash(pw, 10);
        await prisma.user.create({
          data: {
            name: adminName || name,
            email: adminEmailNorm,
            password: hashed,
            role: 'company_admin',
            companyId: company.id,
          },
        });
      }
    }
    const templateArticles = await prisma.mercurialeArticle.findMany({ where: { companyId: 'template' } });
    for (const a of templateArticles) {
      try {
        await prisma.mercurialeArticle.create({
          data: {
            code: a.code,
            designation: a.designation,
            conditionnement: a.conditionnement,
            categorie: a.categorie,
            type: a.type,
            regionId: a.regionId,
            companyId: company.id,
            prix_min: a.prix_min,
            prix_moyen: a.prix_moyen,
            prix_max: a.prix_max,
          },
        });
      } catch (e) {
        // Ignorer les doublons ou erreurs de copie mercuriale
      }
    }
    const full = await prisma.company.findUnique({
      where: { id: company.id },
      include: { subscriptions: true, users: { select: { id: true, name: true, email: true, phone: true, role: true, assignedTasks: true } } },
    });
    res.status(201).json(full);
  } catch (err) {
    if (err?.code === 'P2002') {
      const target = err?.meta?.target || [];
      if (target.includes('email')) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé par une entreprise ou un utilisateur.' });
      }
    }
    console.error('Erreur création entreprise:', err);
    res.status(500).json({ error: err?.message || 'Erreur serveur lors de la création de l\'entreprise.' });
  }
});

router.post('/:companyId/users', authMiddleware, requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, email, password, role, assignedTasks, phone } = req.body || {};
    const passwordStr = password != null ? String(password).trim() : '';
    if (!name || !email || !passwordStr) return res.status(400).json({ error: 'Nom, email et mot de passe requis' });
    if (passwordStr.length < 4) return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 4 caractères' });
    const userRole = req.role === 'super_admin' ? (role || 'company_user') : (role || 'company_user');
    const targetCompanyId = req.role === 'super_admin' ? companyId : req.companyId;
    if (!targetCompanyId) return res.status(400).json({ error: 'Entreprise requise' });
    if (req.role === 'company_admin' && targetCompanyId !== req.companyId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const tasksJson = Array.isArray(assignedTasks) ? JSON.stringify(assignedTasks) : (assignedTasks != null && typeof assignedTasks === 'string' ? assignedTasks : null);
    const hashed = await bcrypt.hash(passwordStr, 10);
    const user = await prisma.user.create({
      data: { name, email: email.trim().toLowerCase(), password: hashed, role: userRole, companyId: targetCompanyId, assignedTasks: tasksJson, phone: phone ? String(phone).trim() : null },
    });
    const { password: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) {
    if (err?.code === 'P2002' && err?.meta?.target?.includes('email')) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }
    console.error('Erreur création utilisateur:', err);
    res.status(500).json({ error: err?.message || 'Erreur lors de la création du compte.' });
  }
});

export default router;
