# Gemini.md — Guide pour Gemini Code (📦 projet: <anaylseur web>)

> But: permettre à Gemini Code (gemini.ai/code) d’intervenir efficacement sur ce repo **sans contexte superflu**, avec sorties en **diffs appliquables**, **tests**, et **docs à jour**.

---

## 0) Gestion des Sous-Agents : Votre Équipe d'Experts AI

En tant qu'agent principal, votre rôle est de **coordonner les tâches, déléguer aux sous-agents appropriés, et synthétiser leurs résultats** avant de répondre à l'utilisateur.

- **Délégation** :
  - **Automatique** : analyser la demande de l'utilisateur et, si elle correspond à l'expertise d'un sous-agent, lui déléguer automatiquement la tâche. La **description** de chaque sous-agent est cruciale pour identifier quand l'utiliser.
  - **Explicite** : l'utilisateur peut aussi demander explicitement d'utiliser un sous-agent en le taguant avec `@NomDeL_agent` dans son prompt.
  - **Parallèle** : si plusieurs sous-agents peuvent travailler indépendamment, les faire opérer en parallèle pour accélérer le processus.

- **Gestion du Contexte** :
  - Chaque sous-agent opère dans sa **propre fenêtre de contexte isolée**.
  - Les sous-agents **répondent toujours à vous (l’agent principal)**, jamais directement à l’utilisateur.
  - **Partage de Contexte** : pour les tâches complexes, maintenir un fichier partagé (`doc/task/context_session.md`) que les sous-agents lisent et mettent à jour.

- **Outils et Spécialisation** :
  - Chaque sous-agent possède son propre **ensemble d’outils limité**.
  - **Privilégier la spécialisation** : éviter de créer des sous-agents trop génériques.

- **Exemples de Sous-Agents** :
  - `WebResearchSpecialist` (cyan) : recherche web rapide et fiable.
  - `ProductManager` (orange) : user stories, exigences fonctionnelles.
  - `UXUIDesigner` (jaune) : design system, spécifications écrans.
  - `ArchitectureAgent` (gris) : architecture système, sécurité, APIs.
  - `DevOpsEngineer` (marron) : environnement dev, CI/CD.
  - `SecurityAnalyst` (noir) : audits sécurité, dépendances.
  - `FrontendEngineer` (violet) : interfaces Next.js/React/Tailwind.
  - `BackendEngineer` (rouge) : APIs, DB, auth/roles.
  - `CodeReviewer` (rose) : relecture et optimisation de code.
  - `Tester` (bleu clair) : tests unitaires/intégration/e2e.
  - `XAPIPoster` (bleu) : intégration API X.
  - `ImageGenAgent` (vert) : génération d’images/vidéos (FAL).
  - `OptimizerSubAgent` (cyan) : refactoring/optimisations.
  - `ReleaseNotesGenerator` (vert) : notes de release.
  - `ChangeLogUpdater` (marron clair) : gestion changelog/versionning.

---

## 1) Aperçu Projet (à compléter rapidement)

Si des infos manquent, pose-moi exactement 3 questions ciblées pour compléter :

- **Objectif produit** : …
- **Fonctions clés** : …
- **Public cible / plans** : …

---

## 2) Stack & Contraintes

- **Framework**: Next.js **15** (App Router) • **TypeScript strict**
- **UI**: Tailwind CSS v4 • shadcn/ui
- **Auth**: Better Auth (multi-organisation, rôles)
- **Billing**: Stripe (abos/quotas)
- **DB**: PostgreSQL + Prisma (auth/billing) • Supabase (métier)
- **Email**: React Email + Resend
- **Tests**: Vitest (unit) • Playwright (e2e)
- **Queue**: Redis _(si workflows async)_
- **Workflows**: n8n (webhooks HMAC, sync<5s / async≥5s)
- **Contraintes**: responsive, idempotence, rate-limit, logs corrélés (runId), zéro secret en clair

---

## 3) Conventions d’IO pour Gemini Code

Toujours produire des **fichiers** et **diffs unifiés** :

```txt
path: <chemin/vers/fichier.ext>
<contenu complet du fichier>

diff
--- a/<ancien>
+++ b/<nouveau>
@@
<patch>


**Exigé pour chaque tâche de code** :

1. Fichiers modifiés/créés ✅
2. **Tests** (unit/integration/e2e selon le scope) ✅
3. **Mise à jour docs** (README concerné / Gemini.md si specs changent) ✅

Interdits : commandes shell réelles, secrets, tokens, clés `service_role`.

---

## 4) Points chauds du repo (où regarder/écrire)

- `app/` : pages & routes (App Router)
- `src/components/` : UI (shadcn/ui dans `ui/`, customs dans `nowts/`)
- `src/features/` : logique par feature
- `src/lib/` : configs, services, clients API
- `src/hooks/` : hooks React
- `emails/` : templates React Email
- `prisma/` : `schema.prisma`, migrations, seed
- `__tests__/` : unit
- `e2e/` : e2e (Playwright)

---

## 5) Intégration n8n & Supabase — _Context packs_

Quand tu touches un workflow, charge **uniquement** son pack minimal :

```

/workflows/<slug>/
workflow.json # export n8n SANITISÉ (aucun credential)
input.schema.json # schéma d’entrée (Zod/JSON Schema)
output.schema.json # schéma de sortie
README.md # Trigger, I/O, SLA (sync/async), erreurs
/workflows/index.yml # mapping → routes API, SLA, webhooks

```

Accès BD métier via **Supabase** (si présent) :

```

/supabase/migrations/_.sql # schéma
/supabase/rls/_.sql # policies RLS + tests
/docs/erd.md # diagramme tables

```

**Garde-fous** : jamais de headers `Authorization`/API keys dans `workflow.json`. Remplacer par `PLACEHOLDER_*`.

---

## 6) Contrats API & Sécurité (exemple)

**Routes type** :

```

POST /api/orgs/[orgSlug]/audits/single
POST /api/orgs/[orgSlug]/audits/batch
GET /api/orgs/[orgSlug]/audits/status # nouveauté Phase 4
GET /api/orgs/[orgSlug]/audits/status/[runId]
POST /api/orgs/[orgSlug]/audits/webhook/n8n # callbacks

````

**Validation** : Zod côté server.

```ts
export const SingleAuditSchema = z.object({
  url: z.string().url(),
  email: z.string().email(),
  deliveryMethod: z.enum(["email", "dashboard"]),
});

export const BatchAuditSchema = z.object({
  csvData: z.string().min(10, 'CSV trop court'),
  batchName: z.string().optional(),
});
````

**API Status (Phase 4)** : Récupération du statut des audits d'une organisation.

```ts
// GET /api/orgs/[orgSlug]/audits/status
// Réponse format:
{
  success: true,
  audits: FormattedAudit[],  // Liste des audits formatés
  stats: AuditStats,         // Statistiques agrégées
  quota: QuotaInfo,          // Informations quota
  organization: OrgInfo,     // Infos organisation
  meta: MetaInfo            // Métadonnées
}
```

**HMAC pour webhooks** :

```ts
import { createHmac, timingSafeEqual } from "crypto";
export function isValidHMAC(payload: string, signature: string) {
  const h = createHmac("sha256", process.env.N8N_WEBHOOK_SECRET!)
    .update(payload)
    .digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(h));
}
```

**Idempotence** : header `Idempotency-Key` + store (clé = userId+route+hash(payload)).

---

## 7) Auth, Billing & Quotas (exigences)

- Better-Auth : helpers `getUser()`/`getRequiredUser()`, organisations, rôles.
- Stripe : produits/plans, webhooks `invoice.paid`/`customer.subscription.updated`.
- Quotas : middleware server (bloque si limite atteinte), compteur mensuel par org.
- UI : afficher quota restant, erreurs “quota_exceeded”, retries guidés.

---

## 8) UX & États (shadcn/ui)

États standard pour toute feature :

- `idle` | `loading` | `success` | `error` | `quota_exceeded`
- Async : barre de progression + ETA, suivi par `runId`, mise à jour par polling (2s) ou WebSocket/SSE.

---

## 9) Commandes Dév (pnpm)

**Core**

- `pnpm dev` • `pnpm build` • `pnpm start`
- `pnpm ts` (type-check) • `pnpm lint` • `pnpm lint:ci`
- `pnpm clean` • `pnpm format`

**Tests**

- `pnpm test:ci` (unit) • `pnpm test:e2e:ci` (e2e)

**DB / Auth**

- `pnpm prisma:seed` • `pnpm better-auth:migrate`

**Outils**

- `pnpm email` • `pnpm stripe-webhooks` • `pnpm knip`

_(ajoute tes scripts custom si besoin)_

---

## 10) Règles & Checklist avant code

**Toujours** vérifier avant un CCODE.\* :

- [ ] Trigger, Inputs, Outputs, Durée (sync/async) clairs
- [ ] Schémas I/O (Zod) alignés avec `workflow.json` (n8n)
- [ ] Auth/Idempotence/HMAC/Rate-limit traités
- [ ] Tables & RLS Supabase (si concerné) précisées
- [ ] Cas d’erreurs + messages UX définis
- [ ] Variables d’env présentes dans `.env.example`

**Sécurité**

- ❌ Pas de secrets, tokens, `service_role` ou credentials dans le code/JSON
- ❌ Pas de commandes shell exécutées
- ✅ Placeholder uniquement + doc mise à jour

---

## 11) Tests & Observabilité (minimum)

- **Unit** : logique (schémas, quotas, mappers)
- **Intégration** : routes API ↔ n8n (mocks), Prisma
- **E2E** : parcours clé (single, batch, affichage rapport)
- **Logs** : structurés (JSON), corrélation par `runId`
- **Métriques** : temps d’exécution, taux d’échec, quotas

---

## 12) Variables d’Environnement (placeholders)

```bash
# n8n
N8N_BASE_URL=<https://n8n.example.com>
N8N_WEBHOOK_SECRET=<REQUIRED>

# Supabase (si utilisé côté serveur uniquement)
SUPABASE_URL=<...>
SUPABASE_ANON_KEY=<...>
SUPABASE_SERVICE_KEY=<SERVER_ONLY>

# Stripe
STRIPE_SECRET_KEY=<...>
STRIPE_WEBHOOK_SECRET=<...>

# Redis (si file d’attente)
REDIS_URL=<redis://...>
```

---

## 13) Tâches types pour Gemini Code

- **Implémenter une route audit**
  1. Créer handler Next.js + schémas Zod
  2. Appel n8n (HMAC + idempotence)
  3. Tests unit + intégration (mocks n8n)
  4. Doc (README workflow + cette section si specs changent)

- **Brancher un workflow n8n async**
  1. Endpoint POST + création `runId`
  2. Polling/WebSocket pour suivi
  3. Webhook callback + MAJ statut
  4. UI états + tests e2e

_(Toujours livrer en fichiers + diff + tests + docs.)_

```

---

Si tu préfères passer par **Gemini Code**, dis-le et je te fournis la **version “path: Gemini.md”** (même contenu, prêt pour un coller-coller direct dans l’outil).
```
