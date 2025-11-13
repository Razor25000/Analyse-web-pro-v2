# Tests End-to-End - Mode d'Emploi

> Tests e2e adaptés selon le guide `docs/testing/e2e-guide.md` pour l'Analyseur Web Pro

## 🎯 Nouveaux Tests Complets

### Tests Disponibles

1. **`full-user-journey-complete.spec.ts`** - Parcours utilisateur A-Z (8 phases)
   - 📋 Découverte (Homepage → Pricing → Signup)
   - ✍️ Inscription avec validation
   - 🎯 Première utilisation (Premier audit + quota)
   - 📊 Suivi temps réel (SSE/WebSocket)
   - ⚠️ Limites quota (5 audits → blocage)
   - 💳 Upgrade payant (Stripe mocké)
   - 🚀 Fonctionnalités premium (Batch upload)
   - ✅ Vérifications finales (Perf + accessibilité)

2. **`edge-cases-complete.spec.ts`** - Cas limites et erreurs
   - 💳 Erreurs paiement (carte refusée, timeouts Stripe)
   - 🌐 Erreurs réseau (timeouts n8n, webhooks échoués)
   - 🔒 Validation sécurisée (XSS, URLs malveillantes)
   - ⚡ Concurrence (multiples audits simultanés)
   - 🔐 Sessions (expiration, reconnexion)
   - 🔄 Récupération (crash, rafraîchissement brutal)

3. **`performance-complete.spec.ts`** - Performance et scalabilité
   - ⏱️ Temps chargement (Homepage < 2s, Dashboard < 3s)
   - 📈 Scalabilité (50+ audits, pagination performante)
   - ⚡ Temps réel (mises à jour SSE < 200ms)
   - 🔍 Recherche/filtrage (< 500ms)
   - 👥 Stress test (5 utilisateurs simultanés)
   - 💾 Mémoire (détection fuites, limite +200%)

## 🚀 Exécution Rapide

```bash
# Tests complets en mode automatique (recommandé pour CI)
pnpm test:e2e:complete

# Tests complets avec interface visuelle (développement)
pnpm test:e2e:complete:headed

# Tests complets en mode développement (plus verbose)
pnpm test:e2e:complete:dev

# Tous les tests (unitaires + e2e complets)
pnpm test:full
```

## 📋 Scripts Détaillés

### Runner Automatique

Le script `scripts/test-e2e-complete.ts` automatise :

1. **Validation environnement** - Variables, dépendances Playwright
2. **Préparation BDD** - Schema Prisma, migrations Better Auth
3. **Health check** - Attente application (60s timeout)
4. **Services mock** - Stripe test, n8n mock, emails
5. **Exécution tests** - Parallèle, retry, rapports
6. **Génération rapports** - JSON + HTML + résumé
7. **Nettoyage** - Données test, fichiers temporaires

### Options Disponibles

```bash
# Mode développement (garde les données)
pnpm test:e2e:complete --dev --skip-cleanup

# Mode headed (voir les navigateurs)
pnpm test:e2e:complete --headed

# Sans parallélisation
pnpm test:e2e:complete --no-parallel
```

## 📊 Rapports Générés

Après exécution, vérifiez `./test-results/` :

```
test-results/
├── index.html           # Rapport HTML interactif
├── results.json         # Résultats détaillés JSON
├── test-summary.json    # Résumé d'exécution
├── README.md           # Guide d'utilisation
├── screenshots/        # Captures d'échecs
└── videos/            # Enregistrements d'échecs
```

## 🔧 Configuration

### Variables d'Environnement Requises

```bash
# Base de données (test séparée)
DATABASE_URL=postgresql://user:pass@localhost:5432/testdb

# Stripe (clés de test)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (mock ou test)
RESEND_API_KEY=re_test_... # ou "dummy"
EMAIL_FROM=test@example.com

# n8n (mock ou sandbox)
N8N_BASE_URL=https://n8n.test.local
N8N_WEBHOOK_SECRET=test_secret

# Application
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

### Utilitaires de Test

- **TestMocks** - Isolation services externes (Stripe, n8n, emails)
- **TestAssertions** - Vérifications métier de haut niveau
- **TestCleanup** - Nettoyage automatique sécurisé
- **TestDataFactory** - Génération données cohérentes

## 🎨 Exemples d'Utilisation

### Test Unique

```bash
# Seulement le parcours A-Z
npx playwright test full-user-journey-complete.spec.ts --headed

# Seulement les cas limites
npx playwright test edge-cases-complete.spec.ts

# Seulement la performance
npx playwright test performance-complete.spec.ts
```

### Debug et Développement

```bash
# Mode debug avec pauses
npx playwright test --debug full-user-journey-complete.spec.ts

# Mode trace pour analyse détaillée
npx playwright test --trace on full-user-journey-complete.spec.ts

# Logs détaillés
DEBUG=pw:* pnpm test:e2e:complete
```

## 🚨 Résolution de Problèmes

### Erreurs Courantes

| Erreur                                 | Solution                                       |
| -------------------------------------- | ---------------------------------------------- |
| `Application non disponible`           | Vérifier que `pnpm dev` tourne sur port 3000   |
| `Variables d'environnement manquantes` | Copier `.env.example` vers `.env.test`         |
| `Timeout waiting for element`          | Vérifier les `data-testid` dans les composants |
| `User already exists`                  | Lancer `pnpm test:cleanup`                     |
| `Browser not installed`                | Exécuter `npx playwright install`              |

### Mode Debug Avancé

```bash
# Pause sur échec avec DevTools
PWDEBUG=1 npx playwright test

# Screenshots à chaque étape
npx playwright test --screenshot=only-on-failure

# Ralentir l'exécution
npx playwright test --slow-mo=1000
```

## 📈 Métriques et Performance

Les tests mesurent automatiquement :

- ⏱️ **Temps de chargement** des pages critiques
- 📊 **Progression des statuts** d'audit via SSE
- 💾 **Utilisation mémoire** lors de navigation intensive
- 🔄 **Résilience réseau** face aux pannes
- 👥 **Charge utilisateur** avec 5 connexions simultanées

Résultats disponibles dans `test-summary.json` et logs console.

---

**Documentation complète** : `docs/testing/e2e-guide.md`  
**Support** : Consulter les logs ou créer une issue pour les problèmes spécifiques
