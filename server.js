require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Rate Limiting : 5 requêtes par IP par heure ──────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'rate_limit',
    message: 'Vous avez atteint la limite de 5 analyses par heure. Réessayez plus tard.'
  },
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

// ─── Client Anthropic ─────────────────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 30000
});

// ─── Prompt système ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un moteur d'analyse de présence en ligne. Tu scrutes le web pour construire un "profil fantôme" : le portrait que se ferait un parfait inconnu en lisant tout ce qui existe publiquement sur une personne.

Utilise l'outil web_search pour chercher le nom fourni. Analyse les résultats : articles, réseaux sociaux, résultats sportifs, publications, mentions, avis laissés, activités publiques.

Génère DEUX portraits distincts :
1. "world_view" : ce que le grand public / un recruteur / un inconnu percevrait (ton neutre, factuel, légèrement froid)
2. "inner_view" : ce que des proches ou des gens de la même communauté percevraient (ton plus chaleureux, plus nuancé)

Les deux portraits sont écrits à la deuxième personne ("Vous êtes…" ou "On vous perçoit comme…"), en français, style littéraire et précis, 3 à 5 phrases chacun.

Calcule un score de visibilité entre 0 et 100 :
- 0–20 : quasiment invisible en ligne
- 21–50 : présence discrète
- 51–80 : présence notable
- 81–100 : très exposé publiquement

Réponds UNIQUEMENT en JSON valide, sans balises markdown :
{
  "world_view": "portrait pour le grand public...",
  "inner_view": "portrait pour les proches...",
  "signals": ["signal 1", "signal 2", "signal 3", "signal 4", "signal 5"],
  "visibility_score": 42,
  "found": true
}

Si aucune information n'est trouvée, mettre found: false, visibility_score: 0, et construire les portraits autour de l'absence elle-même.
Ne jamais inventer de faits. S'appuyer uniquement sur ce qui est réellement trouvé.`;

// ─── Route principale d'analyse ───────────────────────────────────────────────
app.post('/api/analyze', apiLimiter, async (req, res) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({
      error: 'invalid_input',
      message: 'Veuillez fournir un prénom et un nom valides.'
    });
  }

  const cleanName = name.trim().slice(0, 100); // Limiter la longueur

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'config_error',
      message: 'Clé API non configurée. Contactez l\'administrateur.'
    });
  }

  try {
    // Appel à Claude avec l'outil web_search
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Analyse la présence en ligne de cette personne et génère son portrait numérique : "${cleanName}"`
        }
      ]
    });

    // Extraire le contenu texte de la réponse
    let rawText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        rawText += block.text;
      }
    }

    // Nettoyer et parser le JSON
    // Supprimer les éventuelles balises markdown
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Format de réponse invalide');
    }

    const portrait = JSON.parse(jsonMatch[0]);

    // Validation des champs requis
    if (
      typeof portrait.world_view !== 'string' ||
      typeof portrait.inner_view !== 'string' ||
      !Array.isArray(portrait.signals) ||
      typeof portrait.visibility_score !== 'number'
    ) {
      throw new Error('Structure JSON incomplète');
    }

    // Normaliser le score
    portrait.visibility_score = Math.max(0, Math.min(100, Math.round(portrait.visibility_score)));
    portrait.name = cleanName;

    return res.json(portrait);

  } catch (err) {
    console.error('[Miroir Numérique] Erreur API:', err.message);

    if (err.status === 429 || (err.message && err.message.includes('rate'))) {
      return res.status(429).json({
        error: 'api_rate_limit',
        message: 'Service temporairement surchargé. Réessayez dans quelques instants.'
      });
    }

    if (err.name === 'TimeoutError' || (err.message && err.message.includes('timeout'))) {
      return res.status(504).json({
        error: 'timeout',
        message: 'L\'analyse a pris trop de temps. Réessayez avec un nom plus précis.'
      });
    }

    if (err instanceof SyntaxError) {
      return res.status(500).json({
        error: 'parse_error',
        message: 'Erreur lors du traitement de la réponse. Réessayez.'
      });
    }

    return res.status(500).json({
      error: 'server_error',
      message: 'Une erreur inattendue s\'est produite. Réessayez dans quelques instants.'
    });
  }
});

// ─── robots.txt ───────────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /api/
Disallow: /results/
# Miroir Numérique — Aucune donnée n'est stockée sur ce serveur.
`);
});

// ─── Fallback SPA ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Démarrage ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✨ Miroir Numérique démarré sur le port ${PORT}`);
  console.log(`   → http://localhost:${PORT}`);
});
