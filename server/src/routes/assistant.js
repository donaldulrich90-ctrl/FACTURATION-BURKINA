import { Router } from 'express';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Groq = gratuit. OpenAI = payant. Priorité à Groq si les deux sont définis.
const USE_GROQ = !!GROQ_API_KEY;

const SYSTEM_PROMPT = `Tu es l'assistant virtuel de FasoMarchés, une plateforme de gestion pour les entreprises au Burkina Faso et dans l'espace UEMOA.

Ton rôle :
1. Répondre aux questions des clients qui veulent comprendre la plateforme
2. Guider pas à pas les utilisateurs qui ont adopté la plateforme
3. Expliquer les fonctionnalités de manière claire et concise

Contexte de la plateforme :
- FasoMarchés regroupe : facturation (proformas, factures définitives, BL), quittances QSL, mercuriale des prix par région, simulation de marchés, documents administratifs, montage DAO, gestion RH, comptabilité, impôts Burkina.
- Rôles : Super Admin (gère entreprises/abonnements), Gérant (configure l'entreprise, utilisateurs), Collaborateur (accès selon tâches assignées).
- Connexion : email + mot de passe.
- Facturation : choisir/créer client → ajouter lignes → vérifier TVA 18%, AIRSI 0/2/5% → enregistrer → télécharger PDF.
- Quittances : menu Quittances QSL → Émettre → sélectionner facture → date, montant, mode paiement.
- Administration (gérant) : icône Paramètres → profil entreprise, logo/signature/cachet, utilisateurs, tâches assignées.
- Changer mot de passe : icône clé dans la barre d'en-tête.
- Astuces : mode sombre (lune/soleil), chat interne, PWA installable.

Réponds toujours en français, de façon courtoise et professionnelle. Sois concis mais complet. Pour les guides pas à pas, numérote les étapes clairement.`;

async function callAI(messages, maxTokens = 800) {
  if (USE_GROQ && GROQ_API_KEY) {
    const groq = new Groq({ apiKey: GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return completion.choices?.[0]?.message?.content?.trim();
  }
  if (OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    });
    return completion.choices?.[0]?.message?.content?.trim();
  }
  return null;
}

function noApiKeyResponse(res) {
  return res.status(503).json({
    error: 'Assistant non configuré. Définissez GROQ_API_KEY (gratuit) ou OPENAI_API_KEY dans server/.env',
    fallback: true,
  });
}

// Version publique (prospects)
router.post('/public', async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    const text = String(message || '').trim();
    if (!text) return res.status(400).json({ error: 'Message requis' });
    if (text.length > 500) return res.status(400).json({ error: 'Message trop long' });

    if (!GROQ_API_KEY && !OPENAI_API_KEY) return noApiKeyResponse(res);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\nNote : L\'utilisateur n\'est peut-être pas encore connecté. Présentez la plateforme et invitez à se connecter pour plus d\'aide.' },
      ...history.slice(-6).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: text },
    ];

    const reply = await callAI(messages, 600);
    res.json({ reply: reply || 'Désolé, je n\'ai pas pu répondre.' });
  } catch (err) {
    console.error('[Assistant public]', err);
    if (err?.status === 429) {
      return res.status(503).json({
        error: 'Quota API dépassé. Utilisez GROQ_API_KEY (gratuit sur console.groq.com) ou rechargez votre compte OpenAI.',
        fallback: true,
      });
    }
    res.status(500).json({ error: err?.message || 'Erreur assistant' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    const text = String(message || '').trim();
    if (!text) return res.status(400).json({ error: 'Message requis' });

    if (!GROQ_API_KEY && !OPENAI_API_KEY) return noApiKeyResponse(res);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      { role: 'user', content: text },
    ];

    const reply = await callAI(messages, 800);
    res.json({ reply: reply || 'Désolé, je n\'ai pas pu générer une réponse.' });
  } catch (err) {
    console.error('[Assistant]', err);
    if (err?.status === 429) {
      return res.status(503).json({
        error: 'Quota API dépassé. Utilisez GROQ_API_KEY (gratuit) ou rechargez OpenAI. Voir GUIDE_PLATEFORME.md',
        fallback: true,
      });
    }
    if (err?.status === 401) {
      return res.status(500).json({ error: 'Clé API invalide. Vérifiez votre clé dans server/.env' });
    }
    res.status(500).json({ error: err?.message || 'Erreur assistant IA' });
  }
});

export default router;
