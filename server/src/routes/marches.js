import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { logFromRequest } from '../services/auditLog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../../uploads/dao');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const safeExt = ['.pdf', '.doc', '.docx', '.zip'].includes(ext.toLowerCase()) ? ext : '.pdf';
    cb(null, `${req.params.id}-${Date.now()}${safeExt}`);
  },
});
const uploadDao = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 Mo
  fileFilter: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx', '.zip'];
    if (allowed.includes(ext) || file.mimetype?.includes('pdf') || file.mimetype?.includes('document') || file.mimetype?.includes('zip')) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez PDF, DOC, DOCX ou ZIP.'), false);
    }
  },
});

const router = Router();
const prisma = new PrismaClient();

router.get('/', authMiddleware, async (req, res) => {
  const where = {};
  if (req.role !== 'super_admin') where.companyId = req.companyId;
  const marches = await prisma.marche.findMany({
    where,
    include: {
      region: { select: { id: true, nom: true } },
      depenses: true,
      factures: { select: { id: true, numero: true, totalHT: true, totalTTC: true, statut: true } },
      simulation: { include: { articles: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(marches);
});

router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const marche = await prisma.marche.findFirst({
    where: { id },
    include: {
      region: true,
      depenses: true,
      factures: { include: { items: true } },
      simulation: { include: { articles: true } },
    },
  });
  if (!marche) return res.status(404).json({ error: 'Marché introuvable' });
  if (req.role !== 'super_admin' && marche.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  res.json(marche);
});

router.post('/', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const companyId = req.companyId;
  if (!companyId && req.role !== 'super_admin') {
    return res.status(400).json({ error: 'Entreprise requise' });
  }
  const { reference, titre, entite, budgetEstime, regionId } = req.body || {};
  if (!reference || !titre) {
    return res.status(400).json({ error: 'Référence et titre requis' });
  }
  const targetCompanyId = companyId || req.body.companyId || null;
  if (!targetCompanyId) return res.status(400).json({ error: 'Entreprise requise' });

  const marche = await prisma.marche.create({
    data: {
      reference: String(reference).trim(),
      titre: String(titre).trim(),
      entite: entite ? String(entite).trim() : null,
      budgetEstime: budgetEstime != null ? Number(budgetEstime) : null,
      regionId: regionId || null,
      statut: 'prospective',
      companyId: targetCompanyId,
    },
    include: { region: true, depenses: true },
  });
  await logFromRequest(req, 'create', 'marche', marche.id, { reference: marche.reference, titre: marche.titre });
  res.status(201).json(marche);
});

router.patch('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const marche = await prisma.marche.findFirst({ where: { id } });
  if (!marche) return res.status(404).json({ error: 'Marché introuvable' });
  if (req.role !== 'super_admin' && marche.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const { reference, titre, entite, budgetEstime, regionId, statut } = req.body || {};
  const data = {};
  if (reference != null) data.reference = String(reference).trim();
  if (titre != null) data.titre = String(titre).trim();
  if (entite != null) data.entite = entite ? String(entite).trim() : null;
  if (budgetEstime != null) data.budgetEstime = Number(budgetEstime);
  if (regionId != null) data.regionId = regionId || null;
  if (statut != null && ['prospective', 'en_cours', 'execute', 'abandonne'].includes(statut)) data.statut = statut;

  const updated = await prisma.marche.update({
    where: { id },
    data,
    include: { region: true, depenses: true, factures: true },
  });
  await logFromRequest(req, 'update', 'marche', id, { reference: updated.reference });
  res.json(updated);
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const marche = await prisma.marche.findFirst({ where: { id } });
  if (!marche) return res.status(404).json({ error: 'Marché introuvable' });
  if (req.role !== 'super_admin' && marche.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  if (marche.daoFilePath) {
    try {
      const p = path.join(UPLOADS_DIR, path.basename(marche.daoFilePath));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch (_) {}
  }
  await prisma.marche.delete({ where: { id } });
  await logFromRequest(req, 'delete', 'marche', id, { reference: marche.reference });
  res.status(204).send();
});

// DAO (Dossier d'Appel d'Offres) - upload
router.post('/:id/dao', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), uploadDao.single('dao'), async (req, res) => {
  const { id } = req.params;
  const marche = await prisma.marche.findFirst({ where: { id } });
  if (!marche) return res.status(404).json({ error: 'Marché introuvable' });
  if (req.role !== 'super_admin' && marche.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu. Utilisez le champ "dao".' });
  if (marche.daoFilePath) {
    try {
      const oldPath = path.join(UPLOADS_DIR, path.basename(marche.daoFilePath));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch (_) {}
  }
  const fileName = req.file.originalname || req.file.filename;
  const filePath = path.basename(req.file.path);
  await prisma.marche.update({
    where: { id },
    data: { daoFileName: fileName, daoFilePath: filePath },
  });
  const updated = await prisma.marche.findUnique({
    where: { id },
    include: { region: true, depenses: true, factures: true },
  });
  await logFromRequest(req, 'update', 'marche', id, { action: 'upload_dao', fileName });
  res.json(updated);
});

// DAO - téléchargement
router.get('/:id/dao', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const marche = await prisma.marche.findFirst({ where: { id } });
  if (!marche) return res.status(404).json({ error: 'Marché introuvable' });
  if (req.role !== 'super_admin' && marche.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  if (!marche.daoFilePath) return res.status(404).json({ error: 'Aucun DAO téléversé pour ce marché' });
  const fullPath = path.join(UPLOADS_DIR, marche.daoFilePath);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
  const disposition = `attachment; filename="${encodeURIComponent(marche.daoFileName || 'DAO.pdf')}"`;
  res.setHeader('Content-Disposition', disposition);
  res.sendFile(path.resolve(fullPath));
});

// Dépenses d'un marché
router.get('/:id/depenses', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const marche = await prisma.marche.findFirst({ where: { id } });
  if (!marche) return res.status(404).json({ error: 'Marché introuvable' });
  if (req.role !== 'super_admin' && marche.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const depenses = await prisma.marcheDepense.findMany({ where: { marcheId: id }, orderBy: { dateDepense: 'desc' } });
  res.json(depenses);
});

router.post('/:id/depenses', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const marche = await prisma.marche.findFirst({ where: { id } });
  if (!marche) return res.status(404).json({ error: 'Marché introuvable' });
  if (req.role !== 'super_admin' && marche.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const { type, libelle, montant, dateDepense } = req.body || {};
  if (!type || !libelle || montant == null) {
    return res.status(400).json({ error: 'Type, libellé et montant requis' });
  }
  const validTypes = ['enregistrement', 'timbres', 'papiers_admin', 'documents_joindre', 'autre'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Type invalide. Valeurs: ${validTypes.join(', ')}` });
  }
  const depense = await prisma.marcheDepense.create({
    data: {
      marcheId: id,
      type,
      libelle: String(libelle).trim(),
      montant: Math.round(Number(montant)),
      dateDepense: dateDepense ? new Date(dateDepense) : undefined,
    },
  });
  await logFromRequest(req, 'create', 'marche_depense', depense.id, { marcheId: id, libelle: depense.libelle, montant: depense.montant });
  res.status(201).json(depense);
});

router.delete('/:id/depenses/:depenseId', authMiddleware, async (req, res) => {
  const { id, depenseId } = req.params;
  const depense = await prisma.marcheDepense.findFirst({ where: { id: depenseId, marcheId: id }, include: { marche: true } });
  if (!depense) return res.status(404).json({ error: 'Dépense introuvable' });
  if (req.role !== 'super_admin' && depense.marche.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  await prisma.marcheDepense.delete({ where: { id: depenseId } });
  await logFromRequest(req, 'delete', 'marche_depense', depenseId, { marcheId: id });
  res.status(204).send();
});

export default router;
