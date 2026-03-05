import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Expire les abonnements dont la date de fin (endDate) est dépassée.
 * Met à jour le statut de "active" à "expired".
 * @returns {Promise<{ expired: number }>} Nombre d'abonnements expirés
 */
export async function expireSubscriptions() {
  const now = new Date();
  const result = await prisma.subscription.updateMany({
    where: {
      status: 'active',
      endDate: { lt: now },
    },
    data: { status: 'expired' },
  });
  if (result.count > 0) {
    console.log(`[Abonnements] ${result.count} abonnement(s) expiré(s) automatiquement.`);
  }
  return { expired: result.count };
}

/**
 * Démarre la tâche planifiée d'expiration des abonnements.
 * Intervalle configurable via SUBSCRIPTION_EXPIRE_INTERVAL_MS (en millisecondes).
 * Exemples : 3600000 = 1h, 86400000 = 24h (1 jour)
 * @param {number} [intervalMs] Intervalle en ms (défaut : 1 heure)
 */
export function startSubscriptionExpireScheduler(intervalMs = 3600000) {
  if (intervalMs <= 0) return;
  expireSubscriptions().catch((e) => console.error('[Abonnements] Erreur expiration:', e));
  const interval = setInterval(() => {
    expireSubscriptions().catch((e) => console.error('[Abonnements] Erreur expiration:', e));
  }, intervalMs);
  const hours = (intervalMs / 3600000).toFixed(1);
  console.log(`[Abonnements] Expiration automatique activée (toutes les ${hours}h).`);
  return () => clearInterval(interval);
}
