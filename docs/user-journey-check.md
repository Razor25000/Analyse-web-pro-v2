# User Journey Validation — Pré-Prod

## Contexte

- Produit : SaaS (boilerplate now.ts)
- Cible : PME (prospects/clients)
- Objectif : garantir que le parcours Pricing → Checkout → Activation → Dashboard est **sans friction** et **sans faille de droits**.

## Parcours cibles

### A. Offre Gratuite

1. **Landing** `/` → L’utilisateur clique “Essayer gratuitement”.
2. **Signup** `/signup?plan=free` → création compte.
3. **Redirection** `/dashboard/audit`.
   **Résultats attendus**

- User créé avec `role=free`, `plan=free`.
- Quotas initiaux `free` appliqués (DB: quotas >= 1).
- Accès autorisé à `/dashboard/audit`.

### B. Offre 49€/mois / 100€/mois / Annuel (490€/1000€)

1. **Landing** `/` → L’utilisateur clique sur un bouton payant.
2. **Checkout** `/checkout?price=price_xxx` → ouverture Stripe Checkout.
3. **Paiement**
   - **Succès** : Stripe envoie `checkout.session.completed` + `customer.subscription.created/updated`.
   - **Échec/Abandon** : l’utilisateur revient sur `/pricing` avec message d’erreur/annulation.
4. **Post-Checkout** : `GET /post-checkout?session_id=...`
   **Résultats attendus (Succès)**

- Webhook reçu et validé (signature).
- `subscriptions` DB sync : `status in ('active','trialing')`, `price_id`, `interval`.
- **Création user** côté serveur uniquement ici :
  - `user.role in ('starter','pro')` selon `price_id`.
  - Organisation + membership créés.
  - Quotas initiaux appliqués selon plan.
- Email Magic Link (ou login direct si JWT bootstrap).
- Redirection vers `/dashboard/audit` **après preuve serveur**.
  **Résultats attendus (Échec/Abandon)**
- **Aucun user créé**.
- Message : “Paiement interrompu — réessayer” + bouton.

## Garde-fous & Règles d’accès

- Middleware : `/dashboard/audit` accessible si et seulement si :
  - FREE : `role=free` **et** `plan=free`.
  - PAYANT : `subscription.status in ('active','trialing')` **et** `role in ('starter','pro')`.
- Interdit si `pending_payment=true` ou si aucun abonnement actif côté DB.

## Événements Stripe à gérer (webhooks)

- `checkout.session.completed` (subscription)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted` (downgrade / fin d’accès)

**Actions serveur**

- Vérifier signature webhook.
- Upsert `customers`, `subscriptions`.
- Sur `status` actif/trialing → créer user/org/role/quotas si absent.
- Sur `deleted/canceled/past_due` → bloquer accès, réduire quotas, notifier.

## Cas limites à tester

- Abandon Checkout → aucun compte créé.
- Paiement échoué → aucun compte créé.
- Webhook en retard → `/post-checkout` affiche “finalisation en cours”, polling 10–15s.
- Double clic sur bouton pricing → une seule session Checkout valide.
- Déconnexion/reconnexion entre succès et email → possibilité de **Resend Magic Link**.

## Critères de validation finaux

- ✅ Aucun utilisateur payant n’est créé sans évènement Stripe valide.
- ✅ Aucun accès `/dashboard/audit` payant sans `subscription.status` OK.
- ✅ Free flow fonctionne de bout en bout, quotas appliqués.
- ✅ Downgrade appliqué à réception des webhooks `deleted/canceled`.
- ✅ Temps total (payant) ≤ 90s (réseau normal).

## Observabilité (recommandée)

- Logs structurés sur `/api/checkout`, webhooks, `/post-checkout`.
- Métriques : taux d’abandon, délai moyen webhook→création user.
- Alertes si webhook non reçu après 60s (file dead-letter).
