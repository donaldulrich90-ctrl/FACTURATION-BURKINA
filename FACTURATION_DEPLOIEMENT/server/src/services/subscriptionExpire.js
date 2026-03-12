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
 * Délai initial de 10s pour laisser la DB être prête (Render, migrations, etc.)
 * @param {number} [intervalMs] Intervalle en ms (défaut : 1 heure)
 */
export function startSubscriptionExpireScheduler(intervalMs = 3600000) {
  if (intervalMs <= 0) return;
  const run = () => expireSubscriptions().catch((e) => {
    if (e?.code === 'P1001' || e?.message?.includes('Can\'t reach database')) {
      console.warn('[Abonnements] Base non disponible, réessai au prochain cycle.');
    } else {
      console.error('[Abonnements] Erreur expiration:', e?.message || e);
    }
  });
  setTimeout(run, 10000);
  const interval = setInterval(run, intervalMs);
  const hours = (intervalMs / 3600000).toFixed(1);
  console.log(`[Abonnements] Expiration automatique activée (toutes les ${hours}h).`);
  return () => clearInterval(interval);
}
