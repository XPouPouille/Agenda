# Agenda Compétitions

Application perso de suivi de compétitions sportives : inscriptions, statuts, résultats, export vers Google Agenda, thème clair/sombre.

## Fonctionnalités

- Liste des compétitions avec statut : **Faire inscription**, **Payé**, **Annulé**, **Terminé**
- Par compétition : lien vers la page officielle, tarif, lieu/adresse (avec aperçu et lien Google Maps), discipline + sous-catégorie (ex. Natation → Crawl, Dos, Brasse, Papillon, 4 Nages), format (XS/S/M/L/XL/XXL) ou distance en km
- Résultats : temps, classement général, classement catégorie, lien vers le site du résultat
- Export d'une compétition vers Google Agenda (OAuth, rappel automatique la veille)
- Page **Résultats** : tableau filtrable (discipline / sous-catégorie / année) + graphique de progression des temps
- Barre de synthèse : somme des inscriptions par statut, filtrable par année ou globale
- Thème clair / sombre (persisté, respecte les préférences système par défaut)
- Disciplines et sous-catégories extensibles depuis l'interface

## Stack

- **Backend** : FastAPI + SQLAlchemy + PostgreSQL
- **Frontend** : React + TypeScript + Vite + recharts
- **Déploiement** : Docker Compose, reverse-proxy Traefik (labels fournis, pas de port publié directement)

> Note v0.0.1 : le schéma de base est créé automatiquement au démarrage (`Base.metadata.create_all`), pas de migrations Alembic pour l'instant.

## Configuration

1. Copier `.env.example` en `.env` et renseigner les valeurs (identifiants Postgres, domaine Traefik, CORS, identifiants Google OAuth). **Le fichier `.env` n'est jamais commité.**
2. Créer des identifiants OAuth Google Cloud Console :
   - Console Google Cloud → APIs & Services → Identifiants → Créer des identifiants → ID client OAuth → type **Application Web**
   - Activer l'API **Google Calendar**
   - URI de redirection autorisé : `https://<TRAEFIK_DOMAIN>/api/auth/google/callback`
   - Reporter `Client ID` / `Client Secret` dans `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)
   - Première connexion : aller sur `https://<TRAEFIK_DOMAIN>/api/auth/google/login`, accepter le consentement, le refresh token est stocké en base automatiquement

## Lancer en local

```bash
docker compose up -d --build
```

- Frontend : http://localhost (ou via Traefik selon la configuration réseau)
- API : `/api/...` (proxifiée par nginx)

## Déploiement

L'app est prévue pour tourner en containers Docker derrière un reverse-proxy Traefik existant (réseau externe nommé `frontend`, entrypoint `websecure`, certresolver `letsencrypt`). Sur le serveur :

```bash
git clone https://github.com/XPouPouille/Agenda.git
cd Agenda
cp .env.example .env   # puis éditer .env avec les vraies valeurs
docker compose up -d --build
```

## Structure du projet

```
backend/    API FastAPI (modèles, routes, intégration Google Calendar)
frontend/   Application React (Agenda + Résultats)
docker-compose.yml
.env.example
```
