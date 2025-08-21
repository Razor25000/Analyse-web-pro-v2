-- Fonction pour incrémenter atomiquement le quota utilisé d'un utilisateur
-- Usage: SELECT increment_quota_used('user@example.com', 1);

CREATE OR REPLACE FUNCTION increment_quota_used(
  user_email text,
  increment_by integer DEFAULT 1
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Exécute avec les privilèges du créateur
AS $$
DECLARE
  updated_subscriber subscribers%ROWTYPE;
  result json;
BEGIN
  -- Vérifier que l'increment est positif
  IF increment_by <= 0 THEN
    RAISE EXCEPTION 'increment_by must be positive, got %', increment_by;
  END IF;

  -- Mettre à jour et récupérer les nouvelles valeurs
  UPDATE subscribers 
  SET 
    quota_used = COALESCE(quota_used, 0) + increment_by,
    updated_at = NOW()
  WHERE email = user_email
  RETURNING * INTO updated_subscriber;

  -- Vérifier que l'utilisateur existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found in subscribers', user_email;
  END IF;

  -- Construire la réponse JSON
  result := json_build_object(
    'success', true,
    'email', updated_subscriber.email,
    'quota_used', updated_subscriber.quota_used,
    'monthly_quota', updated_subscriber.monthly_quota,
    'quota_remaining', COALESCE(updated_subscriber.monthly_quota, 0) - COALESCE(updated_subscriber.quota_used, 0),
    'subscription_tier', updated_subscriber.subscription_tier,
    'updated_at', updated_subscriber.updated_at
  );

  RETURN result;
END;
$$;

-- Accorder les permissions nécessaires
-- GRANT EXECUTE ON FUNCTION increment_quota_used(text, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION increment_quota_used(text, integer) TO service_role;

-- Test de la fonction (à supprimer en production)
-- SELECT increment_quota_used('test@example.com', 1);