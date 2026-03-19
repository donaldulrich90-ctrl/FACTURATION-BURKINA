import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Enregistre une action dans le journal d'audit.
 * @param {Object} opts
 * @param {string} [opts.userId] - ID utilisateur (null si non authentifié)
 * @param {string} [opts.companyId] - ID entreprise (null pour super_admin)
 * @param {string} opts.action - create | update | delete | login | login_failed
 * @param {string} opts.entity - facture | user | company | client | marche | quittance | simulation | etc.
 * @param {string} [opts.entityId] - ID de l'entité concernée
 * @param {Object|string} [opts.details] - Résumé ou données (sera stringifié en JSON)
 * @param {string} [opts.ipAddress]
 * @param {string} [opts.userAgent]
 */
export async function logAudit(opts) {
  try {
    const detailsStr = opts.details != null
      ? (typeof opts.details === 'string' ? opts.details : JSON.stringify(opts.details))
      : null;
    await prisma.auditLog.create({
      data: {
        userId: opts.userId ?? null,
        companyId: opts.companyId ?? null,
        action: opts.action,
        entity: opts.entity,
        entityId: opts.entityId ?? null,
        details: detailsStr,
        ipAddress: opts.ipAddress ?? null,
        userAgent: opts.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error('[auditLog] Erreur enregistrement:', e);
  }
}

/**
 * Helper pour logger depuis une requête Express (req) après une action réussie.
 */
export function logFromRequest(req, action, entity, entityId, details) {
  const userId = req.userId ?? null;
  const companyId = req.companyId ?? null;
  const ip = req.ip || req.connection?.remoteAddress || null;
  const ua = req.headers?.['user-agent'] ?? null;
  return logAudit({ userId, companyId, action, entity, entityId, details, ipAddress: ip, userAgent: ua });
}
