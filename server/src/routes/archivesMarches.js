import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ARCHIVES = path.join(__dirname, '../../uploads/archives');

if (!fs.existsSync(UPLOADS_ARCHIVES)) {
  fs.mkdirSync(UPLOADS_ARCHIVES, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_ARCHIVES),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const safeExt = allowed.includes(ext.toLowerCase()) ? ext : '.pdf';
    const archiveId = req.params.id || 'new';
    cb(null, `${archiveId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});
const uploadDoc = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 Mo
  fileFilter: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase();
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ok = allowed.includes(ext) || /pdf|image|document/.test(file.mimetype || '');
    if (ok) cb(null, true);
    else cb(new Error('Format non supporté. Utilisez PDF, JPG, PNG, DOC ou DOCX.'), false);
  },
});

const router = Router();
const prisma = new PrismaClient();

// Liste des archives (marchés exécutés) de l'entreprise
router.get('/', authMiddleware, async (req, res) => {
  const where = {};
  if (req.role !== 'super_admin') where.companyId = req.companyId;
  const archives = await prisma.marcheArchive.findMany({
    where,
    include: {
      documents: { select: { id: true, fileName: true, fileSize: true, contentType: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(archives);
});

// Créer une archive (marché exécuté)
router.post('/', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const companyId = req.companyId;
  if (!companyId && req.role !== 'super_admin') {
    return res.status(400).json({ error: 'Entreprise requise' });
  }
  const { reference, titre, entite, dateDebut, dateFin, montant, remarques } = req.body || {};
  if (!reference || !titre) {
    return res.status(400).json({ error: 'Référence et titre requis' });
  }
  const targetCompanyId = companyId || req.body.companyId;
  if (!targetCompanyId) return res.status(400).json({ error: 'Entreprise requise' });

  const archive = await prisma.marcheArchive.create({
    data: {
      companyId: targetCompanyId,
      reference: String(reference).trim(),
      titre: String(titre).trim(),
      entite: entite ? String(entite).trim() : null,
      dateDebut: dateDebut ? new Date(dateDebut) : null,
      dateFin: dateFin ? new Date(dateFin) : null,
      montant: montant != null ? Math.round(Number(montant)) : null,
      remarques: remarques ? String(remarques).trim() : null,
    },
    include: { documents: true },
  });
  res.status(201).json(archive);
});

// Détail d'une archive
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const archive = await prisma.marcheArchive.findFirst({
    where: { id },
    include: { documents: true },
  });
  if (!archive) return res.status(404).json({ error: 'Archive introuvable' });
  if (req.role !== 'super_admin' && archive.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  res.json(archive);
});

// Mettre à jour une archive
router.patch('/:id', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const archive = await prisma.marcheArchive.findFirst({ where: { id } });
  if (!archive) return res.status(404).json({ error: 'Archive introuvable' });
  if (req.role !== 'super_admin' && archive.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const { reference, titre, entite, dateDebut, dateFin, montant, remarques } = req.body || {};
  const data = {};
  if (reference != null) data.reference = String(reference).trim();
  if (titre != null) data.titre = String(titre).trim();
  if (entite != null) data.entite = entite ? String(entite).trim() : null;
  if (dateDebut != null) data.dateDebut = dateDebut ? new Date(dateDebut) : null;
  if (dateFin != null) data.dateFin = dateFin ? new Date(dateFin) : null;
  if (montant != null) data.montant = Math.round(Number(montant));
  if (remarques != null) data.remarques = remarques ? String(remarques).trim() : null;
  const updated = await prisma.marcheArchive.update({
    where: { id },
    data,
    include: { documents: true },
  });
  res.json(updated);
});

// Supprimer une archive (et ses documents sur disque)
router.delete('/:id', authMiddleware, requireRole('company_admin', 'super_admin'), async (req, res) => {
  const { id } = req.params;
  const archive = await prisma.marcheArchive.findFirst({
    where: { id },
    include: { documents: true },
  });
  if (!archive) return res.status(404).json({ error: 'Archive introuvable' });
  if (req.role !== 'super_admin' && archive.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  for (const doc of archive.documents) {
    const fullPath = path.join(UPLOADS_ARCHIVES, doc.filePath);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (_) {}
    }
  }
  await prisma.marcheArchive.delete({ where: { id } });
  res.status(204).send();
});

// Upload d'un document scanné sur une archive
router.post('/:id/documents', authMiddleware, requireRole('company_admin', 'company_user', 'super_admin'), uploadDoc.single('document'), async (req, res) => {
  const { id } = req.params;
  const archive = await prisma.marcheArchive.findFirst({ where: { id } });
  if (!archive) return res.status(404).json({ error: 'Archive introuvable' });
  if (req.role !== 'super_admin' && archive.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu. Utilisez le champ "document".' });
  const fileName = req.file.originalname || req.file.filename;
  const filePath = path.basename(req.file.path);
  const doc = await prisma.marcheArchiveDocument.create({
    data: {
      marcheArchiveId: id,
      fileName,
      filePath,
      fileSize: req.file.size,
      contentType: req.file.mimetype || null,
    },
  });
  const updated = await prisma.marcheArchive.findUnique({
    where: { id },
    include: { documents: true },
  });
  res.status(201).json(updated);
});

// Télécharger un document
router.get('/:id/documents/:docId', authMiddleware, async (req, res) => {
  const { id, docId } = req.params;
  const archive = await prisma.marcheArchive.findFirst({ where: { id } });
  if (!archive) return res.status(404).json({ error: 'Archive introuvable' });
  if (req.role !== 'super_admin' && archive.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const doc = await prisma.marcheArchiveDocument.findFirst({
    where: { id: docId, marcheArchiveId: id },
  });
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  const fullPath = path.join(UPLOADS_ARCHIVES, doc.filePath);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
  const disposition = `attachment; filename="${encodeURIComponent(doc.fileName)}"`;
  res.setHeader('Content-Disposition', disposition);
  if (doc.contentType) res.setHeader('Content-Type', doc.contentType);
  res.sendFile(path.resolve(fullPath));
});

// Supprimer un document d'une archive
router.delete('/:id/documents/:docId', authMiddleware, requireRole('company_admin', 'super_admin'), async (req, res) => {
  const { id, docId } = req.params;
  const doc = await prisma.marcheArchiveDocument.findFirst({
    where: { id: docId, marcheArchiveId: id },
    include: { archive: true },
  });
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  if (req.role !== 'super_admin' && doc.archive.companyId !== req.companyId) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  const fullPath = path.join(UPLOADS_ARCHIVES, doc.filePath);
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } catch (_) {}
  }
  await prisma.marcheArchiveDocument.delete({ where: { id: docId } });
  const updated = await prisma.marcheArchive.findUnique({
    where: { id },
    include: { documents: true },
  });
  res.json(updated);
});

export default router;
