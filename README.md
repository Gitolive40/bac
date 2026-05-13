# Linéaire — Guide de déploiement

## Prérequis
- Node.js installé ✓
- Compte GitHub ✓
- Clé API Anthropic (console.anthropic.com)

---

## Étape 1 — Installer le projet en local

Ouvre un terminal (PowerShell ou CMD) et tape :

```bash
cd Desktop
npm install
npm run dev
```

Ouvre http://localhost:3000 pour tester en local.

---

## Étape 2 — Créer un fichier .env.local

Dans le dossier du projet, crée un fichier `.env.local` :

```
ANTHROPIC_API_KEY=sk-ant-api03-XXXX
```

Remplace `XXXX` par ta vraie clé depuis console.anthropic.com

---

## Étape 3 — Pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TON_USERNAME/lineaire.git
git push -u origin main
```

(Crée d'abord le repo sur github.com/new)

---

## Étape 4 — Déployer sur Vercel

1. Va sur vercel.com et connecte-toi avec GitHub
2. Clique "Add New Project"
3. Sélectionne le repo "lineaire"
4. Dans "Environment Variables", ajoute :
   - Name : `ANTHROPIC_API_KEY`
   - Value : ta clé API
5. Clique "Deploy"

C'est tout ! Vercel te donne une URL publique.
