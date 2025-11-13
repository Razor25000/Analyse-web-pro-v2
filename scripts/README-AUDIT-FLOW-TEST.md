# Test de Flux d'Audit Complet - Mode d'Emploi

> Test de validation pour prévenir les doublons d'audits dans Supabase

## 🎯 Objectif du Test

Ce test valide que le flux complet de création d'audit ne génère **AUCUN DOUBLON** dans la base de données Supabase. Il vérifie le pattern "upsert" implémenté dans le webhook callback.

### Problème Résolu

**Issue initiale** : Des audits en double étaient créés dans Supabase malgré les corrections initiales.

**Solution testée** :
- Pattern upsert dans le webhook (vérifier → créer seulement si inexistant)
- Utilisation correcte des méthodes d'instance SupabaseBridge
- Noms de champs corrigés (camelCase pour Prisma)
- Types de données corrigés (Date objects)
- Nettoyage des connexions database (`disconnect()`)

## 🚀 Exécution Rapide

```bash
# Méthode recommandée : via npm script
pnpm test:audit-flow

# Méthode alternative : exécution directe
./scripts/test-complete-audit-flow.ts

# Méthode alternative : avec tsx
tsx scripts/test-complete-audit-flow.ts
```

## 📋 Prérequis

### 1. Application en cours d'exécution

Le serveur Next.js **DOIT être actif** sur le port 3000 :

```bash
# Dans un terminal séparé
pnpm dev
```

### 2. Variables d'environnement requises

Le fichier `.env.local` doit contenir :

```bash
# Database (REQUIRED)
DATABASE_URL="postgresql://user:pass@host:6543/db?pgbouncer=true&connection_limit=1&sslmode=require&schema=public"

# Supabase (REQUIRED)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your_supabase_service_role_key"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_supabase_anon_key"

# n8n (REQUIRED)
N8N_WEBHOOK_BASE_URL="https://your-n8n-instance.com"
N8N_SINGLE_AUDIT_PATH="/webhook/formulaire-offre-gratuite"
N8N_BATCH_AUDIT_PATH="/webhook/batch-upload"
N8N_WEBHOOK_SECRET="your-webhook-secret-32-chars-min"

# Authentication (REQUIRED)
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-32-character-secret"

# Email & Stripe (peuvent être "dummy" pour tests)
RESEND_API_KEY="re_test_key_or_dummy"
EMAIL_FROM="test@example.com"
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Base de données initialisée

```bash
# Générer le client Prisma
pnpm prisma generate

# Appliquer les migrations (si nécessaire)
pnpm prisma db push
```

## 🔍 Étapes du Test

Le test valide **8 étapes critiques** :

### Step 1: Nettoyage des Données de Test ✨
- Supprime les audits de test existants dans Prisma
- Supprime les audits de test existants dans Supabase
- **Résultat attendu** : Base propre pour test isolé

### Step 2: Déclenchement API Endpoint 🚀
- Appelle `/api/audits/single` avec URL de test
- Vérifie que l'API renvoie un `correlationId`
- **Résultat attendu** : API trigger n8n workflow avec succès

### Step 3: Vérification Non-Création par API ❌
- Vérifie qu'aucun audit n'a été créé directement par l'API
- L'audit doit être créé **uniquement** par le webhook
- **Résultat attendu** : 0 audit dans les deux databases

### Step 4: Simulation Callback Webhook 📞
- Envoie un webhook callback avec données d'audit complétées
- Simule le retour de n8n avec les scores
- **Résultat attendu** : Webhook accepté et traité

### Step 5: Vérification Audit Unique dans Prisma ✅
- Compte les audits dans Prisma avec le `correlationId`
- **Résultat attendu** : Exactement **1 audit** (pas de doublon)

### Step 6: Vérification Audit Unique dans Supabase ✅
- Compte les audits dans Supabase avec le `runId`
- **Résultat attendu** : Exactement **1 audit** (pas de doublon)

### Step 7: Vérification Synchronisation des Scores 🔄
- Compare les scores entre Prisma et Supabase
- Vérifie la conversion camelCase ↔ snake_case
- **Résultat attendu** : Tous les scores identiques

### Step 8: Test Prévention de Doublons 🛡️
- Renvoie le **même** webhook une 2ème fois
- Vérifie que le pattern upsert fonctionne
- **Résultat attendu** : Toujours **1 seul audit** (pas de doublon créé)

## 📊 Interprétation des Résultats

### ✅ Test Réussi (Exemple)

```
🚀 Starting Complete Audit Flow Test
================================================================================

✅ PASS Step 1: Clean Test Data
   Test data cleaned successfully

✅ PASS Step 2: Trigger API Endpoint
   API call successful, correlation ID: abc123xyz

✅ PASS Step 3: Verify No API Audit Creation
   Confirmed: API did not create audit (correct behavior)

✅ PASS Step 4: Simulate Webhook Callback
   Webhook processed successfully, audit ID: audit_xyz789

✅ PASS Step 5: Verify Single Audit in Prisma
   Confirmed: Exactly 1 audit in Prisma (no duplicates)

✅ PASS Step 6: Verify Single Audit in Supabase
   Confirmed: Exactly 1 audit in Supabase (no duplicates)

✅ PASS Step 7: Verify Score Synchronization
   Confirmed: All scores synchronized correctly

✅ PASS Step 8: Test Duplicate Webhook Prevention
   Confirmed: Duplicate webhook did not create duplicate audits (upsert working)

================================================================================
📊 TEST RESULTS SUMMARY
================================================================================

Total Tests: 8
✅ Passed: 8
❌ Failed: 0
Success Rate: 100.0%

🎉 ALL TESTS PASSED - No duplicate audits detected!
```

### ❌ Test Échoué (Exemple)

```
❌ FAIL Step 5: Verify Single Audit in Prisma
   ERROR: Found 2 audits, expected 1
   Data: {
     "count": 2,
     "audits": [...]
   }
```

**Actions à prendre si échec** :

1. **Vérifier le webhook handler** : `app/api/audits/webhook/route.ts`
   - Le pattern upsert est-il correctement implémenté ?
   - Appelle-t-il `getAuditByWebhookId()` avant création ?

2. **Vérifier SupabaseBridge** : `src/lib/supabase/bridge.ts`
   - Les méthodes instance sont-elles utilisées (pas statiques) ?
   - Les noms de champs sont-ils corrects (camelCase) ?

3. **Vérifier les logs serveur** : Terminal où `pnpm dev` tourne
   - Y a-t-il des erreurs de synchronisation Supabase ?
   - Le `disconnect()` est-il appelé ?

## 🔧 Dépannage

### Erreur : "Application non disponible"

```bash
# Solution : Vérifier que le serveur tourne
pnpm dev

# Vérifier que le port 3000 est bien utilisé
netstat -ano | findstr :3000
```

### Erreur : "Variables d'environnement manquantes"

```bash
# Solution : Vérifier .env.local
cat .env.local | grep SUPABASE_URL
cat .env.local | grep DATABASE_URL

# Recharger les variables si nécessaire
dotenv -e .env.local -- tsx scripts/test-complete-audit-flow.ts
```

### Erreur : "Signature invalide" du webhook

```bash
# Solution : En développement, désactiver temporairement la vérification
# OU configurer N8N_WEBHOOK_SECRET correctement dans .env.local
```

### Erreur : "Cannot find module @prisma/client"

```bash
# Solution : Générer le client Prisma
pnpm prisma generate
```

### Erreur : "Table 'audits' does not exist"

```bash
# Solution : Appliquer les migrations
pnpm prisma db push
```

## 📈 Données de Test

Le test utilise des données fictives :

```typescript
const testUrl = "https://example-test-site.com";
const testEmail = "test@example.com";
const testUserId = "test-user-123";
const correlationId = nanoid(); // Généré dynamiquement
```

Ces données sont **automatiquement nettoyées** :
- Au début du test (Step 1)
- Peuvent être nettoyées manuellement après test si nécessaire

## 🎨 Mode Debug

Pour des logs plus détaillés, modifiez le script :

```typescript
// Ajouter des console.log supplémentaires
console.log("🔍 Audit trouvé:", audit);
console.log("🔍 Données Supabase:", supabaseAudits);
```

Ou utilisez Node.js en mode inspect :

```bash
node --inspect-brk ./scripts/test-complete-audit-flow.ts
```

## 🧪 Tests Complémentaires

Ce test se concentre sur **la prévention de doublons**.

Pour tester d'autres aspects :

```bash
# Tests unitaires (bridge, services)
pnpm test

# Tests e2e complets (parcours utilisateur)
pnpm test:e2e:complete

# Tous les tests
pnpm test:full
```

## 📝 Contexte Technique

### Architecture du Flux

```
[API /audits/single]
    ↓ trigger n8n
    ↓ (NE crée PAS d'audit)
    ↓
[n8n Workflow]
    ↓ analyse du site
    ↓ callback avec résultats
    ↓
[Webhook /audits/webhook]
    ↓ getAuditByWebhookId()
    ↓ existe ? → update
    ↓ sinon → create
    ↓
[Prisma + Supabase]
    ✅ UN SEUL audit
```

### Pattern Upsert Implémenté

```typescript
// Récupérer ou créer l'audit (pattern upsert)
const bridge = new SupabaseBridge();
let audit = await bridge.getAuditByWebhookId(correlationId);

if (!audit) {
  // Créer uniquement si inexistant
  audit = await bridge.createAuditWithWebhookId({...});
}

// Mettre à jour avec les scores
await bridge.updateAuditWithScores(correlationId, {...});

// CRITICAL: Nettoyer les connexions
await bridge.disconnect();
```

### Noms de Champs (Prisma ↔ Supabase)

| Prisma (camelCase)  | Supabase (snake_case) |
| ------------------- | --------------------- |
| `webhookId`         | `runId`               |
| `userId`            | `user_id`             |
| `scoreGlobal`       | `score_global`        |
| `scorePerformance`  | `score_performance`   |
| `scoreSeo`          | `score_seo`           |
| `scoreSecurity`     | `score_security`      |
| `scoreModern`       | `score_modern`        |
| `completedAt`       | `completed_at`        |

La conversion est gérée automatiquement par `SupabaseBridge.syncToSupabase()`.

---

**Documentation complète** : [CLAUDE.md](../CLAUDE.md)
**Code webhook** : [app/api/audits/webhook/route.ts](../app/api/audits/webhook/route.ts)
**Code bridge** : [src/lib/supabase/bridge.ts](../src/lib/supabase/bridge.ts)
