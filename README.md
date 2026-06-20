# Miroir Numérique

**Miroir Numérique** est une application web qui utilise l'IA (Anthropic Claude 3.5 Sonnet avec outil de recherche web) pour analyser la présence publique en ligne d'une personne et générer le portrait que s'en ferait un parfait inconnu.

## Fonctionnalités
- **Recherche web en temps réel** via l'API Anthropic
- **Deux portraits générés** : "Ce que le monde voit" et "Ce que vos proches voient"
- **Score de visibilité** de 0 à 100 avec jauge animée
- **Interface immersive** : Mode sombre, typographie élégante, effet machine à écrire
- **Partage viral** : Génération d'image (Canvas HTML5) côté client pour partage sur les réseaux sociaux
- **Sécurité** : Proxy Node.js/Express pour masquer la clé API, Rate Limiting (5 req/heure/IP)

## Stack Technique
- **Frontend** : HTML5, CSS3, JavaScript Vanilla (sans framework)
- **Backend** : Node.js, Express
- **API** : Anthropic Claude (`claude-sonnet-4-5` / `claude-3-5-sonnet-20241022`)

## Installation en local

1. Clonez le dépôt et installez les dépendances :
   ```bash
   npm install
   ```

2. Créez un fichier `.env` à la racine (voir `.env.example`) :
   ```env
   ANTHROPIC_API_KEY=votre_cle_api_anthropic
   PORT=3000
   ```

3. Démarrez le serveur :
   ```bash
   npm start
   ```
   L'application sera disponible sur `http://localhost:3000`.

## Déploiement sur Railway (Gratuit)

Déployer Miroir Numérique prend moins de 3 minutes :

1. **Créer un projet sur Railway**
   - Connectez-vous sur [Railway.app](https://railway.app/)
   - Cliquez sur "New Project" > "Deploy from GitHub repo"
   - Sélectionnez votre dépôt `miroir-numerique`

2. **Configurer les variables d'environnement**
   - Dans Railway, allez dans votre projet > "Variables"
   - Ajoutez la variable `ANTHROPIC_API_KEY` avec votre clé API Anthropic

3. **Générer un domaine public**
   - Allez dans l'onglet "Settings" > "Networking"
   - Cliquez sur "Generate Domain"
   - Votre application est en ligne !

## Mentions Légales & RGPD
L'application ne stocke aucune donnée personnelle. Le serveur agit uniquement comme un proxy de transit. Seules des données publiquement accessibles sur internet sont analysées temporairement par le modèle d'IA. Un fichier `robots.txt` empêche l'indexation des résultats.
