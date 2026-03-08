import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { startSubscriptionExpireScheduler } from './services/subscriptionExpire.js';

// Gestion des erreurs non capturées pour éviter les crashs silencieux
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection]', reason, promise);
});
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import companiesRoutes from './routes/companies.js';
import mercurialeRoutes from './routes/mercuriale.js';
import facturesRoutes from './routes/factures.js';
import clientsRoutes from './routes/clients.js';
import quittancesRoutes from './routes/quittances.js';
import marchesRoutes from './routes/marches.js';
import archivesMarchesRoutes from './routes/archivesMarches.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import plansRoutes from './routes/plans.js';
import simulationsRoutes from './routes/simulations.js';
import appelsOffresRoutes from './routes/appelsOffres.js';
import chatRoutes from './routes/chat.js';
import announcementsRoutes from './routes/announcements.js';
import { initSocket } from './socket.js';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// En-têtes de sécurité
app.use(helmet({ contentSecurityPolicy: false })); // CSP désactivé pour compatibilité PWA/scripts

// CORS : en production, restreindre aux origines autorisées via CORS_ORIGINS
const corsOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()) : true;
app.use(cors({ origin: corsOrigins, credentials: true }));

// Rate limiting global (200 req/15min par IP)
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Rate limiting strict sur le login (5 tentatives / 15 min)
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// Limite augmentée pour logos base64 et imports mercuriale volumineux (12 000+ articles)
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_, res) => res.json({ ok: true, version: '1.0.0-QSL' }));

app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/mercuriale', mercurialeRoutes);
app.use('/api/factures', facturesRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/quittances', quittancesRoutes);
app.use('/api/marches', marchesRoutes);
app.use('/api/archives-marches', archivesMarchesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/simulations', simulationsRoutes);
app.use('/api/appels-offres', appelsOffresRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/announcements', announcementsRoutes);

// 404 pour les routes API non trouvées (après toutes les routes connues)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route API introuvable. Redémarrez le serveur (LANCER.bat) si vous venez d\'ajouter une fonctionnalité.' });
});

// En production : servir l'application React (build) pour avoir une seule URL à partager
const distPath = path.join(__dirname, '..', '..', 'dist');
const serveFrontend = process.env.NODE_ENV === 'production' || process.env.SERVE_FRONTEND === 'true';
if (serveFrontend) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erreur serveur' });
});

const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  initSocket(server);
  console.log(`🚀 FasoMarchés API (QSL) sur http://localhost:${PORT}`);
  if (HOST === '0.0.0.0') console.log('   Accessible sur le réseau : http://VOTRE_IP:3001');
  if (serveFrontend) console.log('   Frontend servi depuis /dist — une seule URL pour tout.');
  const expireIntervalMs = Number(process.env.SUBSCRIPTION_EXPIRE_INTERVAL_MS) || 3600000;
  if (expireIntervalMs > 0) startSubscriptionExpireScheduler(expireIntervalMs);
});
server.setTimeout(600000);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} déjà utilisé. Arrêtez l'autre processus ou changez PORT dans .env`);
  } else {
    console.error('❌ Erreur serveur:', err);
  }
  process.exit(1);
});
