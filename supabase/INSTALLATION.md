# Installation des fonctions Supabase

Ce guide explique comment installer les fonctions SQL nécessaires pour le bon fonctionnement des quotas.

## 📋 Prérequis

- Accès au dashboard Supabase de votre projet
- Permissions pour exécuter du SQL (rôle `service_role` ou admin)

## 🚀 Installation

### 1. Fonction d'incrémentation des quotas

Connectez-vous au [dashboard Supabase](https://app.supabase.com) → votre projet → **SQL Editor**

Copiez et exécutez le contenu de `increment_quota_simple.sql` :

```sql
CREATE OR REPLACE FUNCTION increment_quota_used(
  user_email text,
  increment_by integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validation de l'input
  IF increment_by <= 0 THEN
    RAISE EXCEPTION 'increment_by must be positive';
  END IF;

  -- Mise à jour atomique du quota
  UPDATE subscribers 
  SET 
    quota_used = COALESCE(quota_used, 0) + increment_by,
    updated_at = NOW()
  WHERE email = user_email;

  -- Vérifier que la mise à jour a affecté une ligne
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$;
```

### 2. Permissions de la fonction

```sql
-- Accorder les permissions (selon vos besoins de sécurité)
GRANT EXECUTE ON FUNCTION increment_quota_used(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_quota_used(text, integer) TO service_role;
```

### 3. (Optionnel) Fonction de reset mensuel

Pour automatiser la réinitialisation des quotas chaque mois :

```sql
-- Copiez le contenu de reset_monthly_quotas.sql
-- Puis configurez un cron job ou pg_cron pour l'appeler
-- SELECT reset_monthly_quotas();
```

## 🧪 Test des fonctions

### Tester l'incrémentation

```sql
-- Créer un utilisateur de test dans subscribers
INSERT INTO subscribers (email, monthly_quota, quota_used, subscription_tier, subscribed)
VALUES ('test@example.com', 100, 0, 'basic', true);

-- Tester l'incrémentation
SELECT increment_quota_used('test@example.com', 1);

-- Vérifier le résultat
SELECT email, quota_used, monthly_quota FROM subscribers WHERE email = 'test@example.com';
-- Devrait afficher: quota_used = 1

-- Nettoyer
DELETE FROM subscribers WHERE email = 'test@example.com';
```

### Tester avec l'API

Une fois la fonction installée, l'API utilisera automatiquement la fonction atomique.

Testez en appelant :
```bash
curl -X POST http://localhost:3000/api/orgs/test-org/audits/single \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "email": "test@example.com"}'
```

## 🔍 Monitoring

### Vérifier les quotas

```sql
-- Voir tous les quotas
SELECT 
  email,
  quota_used,
  monthly_quota,
  monthly_quota - quota_used as remaining,
  subscription_tier,
  quota_reset_date
FROM subscribers 
ORDER BY quota_used DESC;
```

### Logs d'erreurs

Les erreurs de fonction apparaîtront dans :
- Les logs de votre application (console.error)
- Les logs Supabase (Dashboard → Logs)

## 🚨 Troubleshooting

### Erreur "function does not exist"

```
ERROR: function increment_quota_used(text, integer) does not exist
```

**Solution** : La fonction n'est pas installée. Réexécutez l'étape 1.

### Erreur "permission denied"

```
ERROR: permission denied for function increment_quota_used
```

**Solution** : Exécutez les commandes GRANT de l'étape 2.

### Fallback automatique

Si la fonction échoue, le code utilise automatiquement un fallback. Vous verrez ce warning :

```
RPC increment_quota_used failed, using fallback: [error message]
```

Le fallback fonctionne mais est moins performant. Installez la fonction pour des performances optimales.

## 📊 Performance

- **Avec fonction** : 1 requête atomique
- **Sans fonction** : 2 requêtes (SELECT + UPDATE)

La fonction réduit les race conditions et améliore les performances sous charge.