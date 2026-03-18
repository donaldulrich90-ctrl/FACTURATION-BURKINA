/**
 * Synchronise mercuriales puis entreprises et leurs données locales vers la plateforme en ligne.
 *
 * Ordre d'exécution :
 *   1. Vérification du token JWT
 *   2. sync-mercuriale-to-online.js (mercuriales template)
 *   3. sync-entreprises-donnees-to-online.js (entreprises + clients + marchés + factures + quittances)
 *
 * Usage:
 *   cd server
 *   npm run sync:all-online
 *
 * Variables d'environnement : ONLINE_URL, JWT_TOKEN (voir SYNC_MERCURIALE_EN_LIGNE.md)
 */
import { spawn } from 'child_process';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = resolve(__dirname);
config({ path: resolve(__dirname, '..', '.env') });

const ONLINE_URL = (process.env.ONLINE_URL || '').replace(/\/$/, '');
const JWT_TOKEN = process.env.JWT_TOKEN || '';

async function verifyToken() {
  if (!ONLINE_URL || !JWT_TOKEN) {
    console.error('❌ ONLINE_URL et JWT_TOKEN requis dans server/.env');
    process.exit(1);
  }
  const res = await fetch(`${ONLINE_URL}/api/companies`, {
    headers: { Authorization: `Bearer ${JWT_TOKEN}` },
  });
  if (res.status === 401) {
    const err = await res.json().catch(() => ({}));
    console.error('❌ Token invalide ou expiré.');
    console.error('   Reconnectez-vous sur la plateforme en ligne (admin@plateforme.com)');
    console.error('   puis F12 → Application → Local Storage → copiez "fasomarches_token"');
    console.error('   et mettez à jour JWT_TOKEN dans server/.env');
    process.exit(1);
  }
}

async function run(script) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('node', [script], {
      cwd: resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true,
    });
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Script ${script} a échoué (code ${code})`));
    });
    child.on('error', reject);
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Synchronisation complète local → en ligne');
  console.log('═══════════════════════════════════════════════════\n');

  await verifyToken();
  console.log('✓ Token valide\n');

  await run(resolve(scriptsDir, 'sync-mercuriale-to-online.js'));
  console.log('');
  await run(resolve(scriptsDir, 'sync-entreprises-donnees-to-online.js'));

  console.log('\n✅ Synchronisation complète terminée.');
}

main().catch((e) => {
  console.error('Erreur:', e.message);
  process.exit(1);
});
