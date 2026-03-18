import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { extractMercurialeFromDocx } from '../utils/extractDocx.js';

const router = Router();
const prisma = new PrismaClient();
const PRIX_MAX = 999_999_999;
function capPrix(v) {
  if (v == null || v === '' || isNaN(Number(v))) return null;
  const n = Math.round(Number(v));
  if (n < 0) return null;
  return Math.min(n, PRIX_MAX);
}

const uploadDocx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase().slice(-5);
    if (ext.endsWith('.docx') || file.mimetype?.includes('wordprocessingml')) {
      cb(null, true);
    } else {
      cb(new Error('Fichier Word (.docx) requis.'), false);
    }
  },
});

function getMercurialeScope(req) {
  if (req.role === 'super_admin') return 'template';
  return req.companyId || 'template';
}

router.get('/regions', authMiddleware, async (_req, res) => {
  const regions = await prisma.region.findMany({ orderBy: { nom: 'asc' } });
  res.json(regions);
});

router.post('/copy-from-template', authMiddleware, requireRole('company_admin', 'company_user'), async (req, res) => {
  const companyId = req.companyId;
  if (!companyId) return res.status(400).json({ error: 'Entreprise requise' });
  const templateArticles = await prisma.mercurialeArticle.findMany({
    where: { companyId: 'template' },
  });
  if (templateArticles.length === 0) return res.json({ copied: 0, message: 'Aucune référence à copier' });
  let copied = 0;
  for (const a of templateArticles) {
    try {
      await prisma.mercurialeArticle.upsert({
        where: { code_conditionnement_regionId_companyId: { code: a.code, conditionnement: a.conditionnement, regionId: a.regionId, companyId } },
        create: {
          code: a.code,
          designation: a.designation,
          conditionnement: a.conditionnement,
          categorie: a.categorie,
          type: a.type,
          regionId: a.regionId,
          companyId,
          prix_min: a.prix_min,
          prix_moyen: a.prix_moyen,
          prix_max: a.prix_max,
        },
        update: {},
      });
      copied++;
    } catch (e) {
      console.warn('Copy ignorée:', a.code, e.message);
    }
  }
  res.json({ copied, message: `${copied} article(s) copié(s) dans votre base.` });
});

router.get('/:regionId', authMiddleware, async (req, res) => {
  const { regionId } = req.params;
  const scope = getMercurialeScope(req);
  const select = { code: true, designation: true, conditionnement: true, categorie: true, type: true, prix_min: true, prix_moyen: true, prix_max: true };
  const articles = await prisma.mercurialeArticle.findMany({
    where: { regionId, companyId: scope },
    select,
    orderBy: { code: 'asc' },
  });
  if (articles.length === 0 && scope !== 'template') {
    const templateArticles = await prisma.mercurialeArticle.findMany({
      where: { regionId, companyId: 'template' },
      select,
      orderBy: { code: 'asc' },
    });
    return res.json(templateArticles);
  }
  res.json(articles);
});

router.post('/:regionId/import', authMiddleware, requireRole('super_admin', 'company_admin'), async (req, res) => {
  const { regionId } = req.params;
  const scope = getMercurialeScope(req);
  const { lines } = req.body || {};
  if (!Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ error: 'Tableau de lignes requis' });
  }
  try {
    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (!region) {
      return res.status(400).json({ error: `Région "${regionId}" inexistante. Exécutez: cd server && npm run db:seed` });
    }
    const company = await prisma.company.findUnique({ where: { id: scope } });
    if (!company) {
      return res.status(400).json({ error: `Entreprise "${scope}" inexistante. Exécutez: cd server && npm run db:seed` });
    }
  } catch (e) {
    console.error('Erreur import mercuriale (validation):', e);
    return res.status(500).json({ error: e.message || 'Erreur lors de l\'import.' });
  }
  let added = 0;
  for (const l of lines) {
    if (!l.code) continue;
    try {
      await prisma.mercurialeArticle.upsert({
        where: { code_conditionnement_regionId_companyId: { code: String(l.code).trim(), conditionnement: l.conditionnement || l.unite || 'Unité', regionId, companyId: scope } },
        create: {
          code: String(l.code).trim(),
          designation: l.designation || '',
          conditionnement: l.conditionnement || l.unite || 'Unité',
          categorie: l.categorie || 'Divers',
          type: l.type || 'article',
          regionId,
          companyId: scope,
          prix_min: capPrix(l.prix_min),
          prix_moyen: capPrix(l.prix_moyen ?? l.prix_ref),
          prix_max: capPrix(l.prix_max),
        },
        update: {
          designation: l.designation ?? undefined,
          conditionnement: l.conditionnement ?? l.unite ?? undefined,
          prix_min: capPrix(l.prix_min) ?? undefined,
          prix_moyen: capPrix(l.prix_moyen ?? l.prix_ref) ?? undefined,
          prix_max: capPrix(l.prix_max) ?? undefined,
        },
      });
      added++;
    } catch (e) {
      console.warn('Import ligne ignorée:', l.code, e.message);
    }
  }
  res.json({ added });
});

// SQLite limite ~999 paramètres ; 50 lignes × ~10 champs = 500 (marge de sécurité)
const BATCH_SIZE = 50;

router.post('/:regionId/extract-docx', authMiddleware, requireRole('super_admin', 'company_admin'), uploadDocx.single('file'), async (req, res) => {
  try {
    const { regionId } = req.params;
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'Fichier Word (.docx) requis.' });
    }
    const { lines, errors } = await extractMercurialeFromDocx(file.buffer);
    res.json({ lines: lines || [], error: errors?.length ? errors.join(' ') : null, meta: { count: lines?.length || 0 } });
  } catch (e) {
    console.error('Erreur extraction Word:', e);
    res.status(500).json({ error: e.message || 'Erreur lors de l\'extraction du Word.' });
  }
});

router.post('/:regionId/replace', authMiddleware, requireRole('super_admin', 'company_admin'), async (req, res) => {
  try {
    const { regionId } = req.params;
    const scope = (req.role === 'super_admin' && req.body?.companyId) ? req.body.companyId : getMercurialeScope(req);
    const { lines } = req.body || {};
    if (!Array.isArray(lines)) return res.status(400).json({ error: 'Tableau de lignes requis' });

    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (!region) {
      return res.status(400).json({ error: `Région "${regionId}" inexistante. Exécutez: cd server && npm run db:seed` });
    }
    const company = await prisma.company.findUnique({ where: { id: scope } });
    if (!company) {
      return res.status(400).json({ error: `Entreprise "${scope}" inexistante. Exécutez: cd server && npm run db:seed` });
    }

    await prisma.mercurialeArticle.deleteMany({ where: { regionId, companyId: scope } });

    const seen = new Set();
    const toInsert = lines
      .filter((l) => l && l.code)
      .map((l) => ({
        code: String(l.code).trim(),
        designation: (l.designation || '').slice(0, 2000),
        conditionnement: (l.conditionnement || l.unite || 'Unité').slice(0, 200),
        categorie: (l.categorie || 'Divers').slice(0, 200),
        type: l.type || 'article',
        regionId,
        companyId: scope,
        prix_min: capPrix(l.prix_min),
        prix_moyen: capPrix(l.prix_moyen ?? l.prix_ref),
        prix_max: capPrix(l.prix_max),
      }))
      .filter((l) => {
        const key = `${l.code}|${l.conditionnement}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      const result = await prisma.mercurialeArticle.createMany({ data: batch });
      inserted += result.count;
    }
    res.json({ replaced: inserted });
  } catch (e) {
    console.error('Erreur import mercuriale:', e);
    let msg = e.message || 'Erreur lors de l\'import.';
    if (e.code === 'P2003') msg = 'Région ou entreprise inexistante. Exécutez: cd server && npm run db:seed';
    if (e.code === 'P2002') msg = 'Doublon (code+conditionnement). Vérifiez les données importées.';
    res.status(500).json({ error: msg });
  }
});

export default router;
