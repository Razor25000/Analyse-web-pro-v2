-- Fonction pour réinitialiser les quotas mensuels
-- À appeler au début de chaque mois (via cron job ou trigger)

CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
  result json;
BEGIN
  -- Réinitialiser tous les quotas utilisés et mettre à jour la date
  UPDATE subscribers 
  SET 
    quota_used = 0,
    quota_reset_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE quota_reset_date < CURRENT_DATE 
    OR quota_reset_date IS NULL;

  -- Compter les lignes mises à jour
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Construire la réponse
  result := json_build_object(
    'success', true,
    'message', 'Monthly quotas reset successfully',
    'users_updated', updated_count,
    'reset_date', CURRENT_DATE
  );

  RETURN result;
END;
$$;

-- Version alternative qui ne réinitialise que les utilisateurs actifs
CREATE OR REPLACE FUNCTION reset_monthly_quotas_active_only()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
  result json;
BEGIN
  -- Réinitialiser seulement les utilisateurs avec un abonnement actif
  UPDATE subscribers 
  SET 
    quota_used = 0,
    quota_reset_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE (quota_reset_date < CURRENT_DATE OR quota_reset_date IS NULL)
    AND subscribed = true
    AND (subscription_end IS NULL OR subscription_end > NOW());

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  result := json_build_object(
    'success', true,
    'message', 'Monthly quotas reset for active subscribers',
    'users_updated', updated_count,
    'reset_date', CURRENT_DATE
  );

  RETURN result;
END;
$$;

-- Exemple de déclenchement mensuel (à adapter selon votre setup)
-- SELECT reset_monthly_quotas();

-- Pour vérifier les quotas avant/après
-- SELECT email, quota_used, monthly_quota, quota_reset_date, subscription_tier 
-- FROM subscribers 
-- ORDER BY updated_at DESC 
-- LIMIT 10;