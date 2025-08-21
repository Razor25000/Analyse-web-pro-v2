-- Version simplifiée de la fonction increment_quota_used
-- À exécuter directement dans l'éditeur SQL de Supabase

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

-- Accorder les permissions (décommenter selon vos besoins)
-- GRANT EXECUTE ON FUNCTION increment_quota_used(text, integer) TO authenticated;
-- GRANT EXECUTE ON FUNCTION increment_quota_used(text, integer) TO service_role;