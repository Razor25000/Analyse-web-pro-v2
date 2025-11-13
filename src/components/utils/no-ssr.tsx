"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

type NoSSRProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Composant pour éviter les erreurs d'hydratation
 * Affiche le contenu seulement côté client
 */
export function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
