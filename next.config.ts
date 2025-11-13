import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // On ne met PAS la clé 'turbo' ici pour le désactiver complètement.
  experimental: {
    authInterrupts: true,
    optimisticClientCache: false,
    webpackBuildWorker: false, // Important pour Windows
  },

  // Configuration pour réduire les erreurs EPERM sur Windows
  webpack: (config, { dev }) => {
    // Appliquer ces optimisations uniquement en mode développement sur Windows
    if (dev && process.platform === "win32") {
      config.watchOptions = {
        poll: 1000, // Vérifie les changements de fichiers à intervalle régulier
        aggregateTimeout: 300, // Délai avant de reconstruire après un changement
        ignored: ["**/.next/**", "**/node_modules/**"],
      };
      config.parallelism = 1; // Force le traitement des fichiers un par un
      config.cache = false; // Désactive le cache de Webpack qui peut causer des conflits
    }
    return config;
  },

  // Variables d'environnement pour s'assurer que le tracing est désactivé
  env: {
    NEXT_TRACE_UPLOAD_DISABLED: "1",
  },

  compiler: {
    // Supprime les console.log en production
    removeConsole: process.env.NODE_ENV === "production",
  },

  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
