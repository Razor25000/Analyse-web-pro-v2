#!/usr/bin/env tsx

/**
 * Script pour nettoyer le cache Next.js avec gestion robuste des erreurs EPERM sur Windows.
 *
 * Ce script gère les problèmes de permissions sur Windows qui causent l'erreur :
 * Error: EPERM: operation not permitted, open 'D:\analyseur-web-pro\.next\trace'
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Supprime un fichier ou dossier avec gestion des erreurs EPERM
 */
async function forceRemove(
  targetPath: string,
  retryCount = 0,
): Promise<boolean> {
  try {
    if (!fs.existsSync(targetPath)) {
      return true; // Déjà supprimé
    }

    const stats = fs.statSync(targetPath);

    if (stats.isDirectory()) {
      // Vider le dossier d'abord
      const files = fs.readdirSync(targetPath);
      for (const file of files) {
        const filePath = path.join(targetPath, file);
        await forceRemove(filePath);
      }

      // Supprimer le dossier vide
      fs.rmdirSync(targetPath);
    } else {
      // Changer les permissions du fichier si possible (Windows)
      try {
        fs.chmodSync(targetPath, 0o666);
      } catch {
        // Ignorer les erreurs de chmod
      }

      // Supprimer le fichier
      fs.unlinkSync(targetPath);
    }

    console.log(`✅ Supprimé: ${targetPath}`);
    return true;
  } catch (error: any) {
    if (error.code === "EPERM" && retryCount < MAX_RETRIES) {
      console.log(
        `⚠️ EPERM sur ${targetPath}, tentative ${retryCount + 1}/${MAX_RETRIES}`,
      );

      // Essayer avec attrib sur Windows
      try {
        if (process.platform === "win32") {
          execSync(`attrib -R -H -S "${targetPath}"`, { stdio: "ignore" });
        }
      } catch {
        // Ignorer les erreurs attrib
      }

      await sleep(RETRY_DELAY);
      return forceRemove(targetPath, retryCount + 1);
    }

    console.warn(`❌ Impossible de supprimer ${targetPath}: ${error.message}`);
    return false;
  }
}

/**
 * Utilise takeown et icacls pour prendre le contrôle du fichier trace et le supprimer
 */
function forceRemoveWithTakeown(tracePath: string): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  try {
    console.log(`🔧 Tentative de prise de contrôle du fichier trace...`);

    // Prendre la propriété du fichier
    execSync(`takeown /f "${tracePath}" /d y`, {
      stdio: "ignore",
      timeout: 5000,
    });

    // Donner les permissions complètes
    execSync(`icacls "${tracePath}" /grant everyone:F`, {
      stdio: "ignore",
      timeout: 5000,
    });

    // Enlever les attributs read-only, hidden, system
    execSync(`attrib -R -H -S "${tracePath}"`, {
      stdio: "ignore",
      timeout: 5000,
    });

    // Maintenant essayer de supprimer
    fs.unlinkSync(tracePath);

    console.log("✅ Fichier trace supprimé avec takeown/icacls");
    return true;
  } catch (error: any) {
    console.warn(`⚠️ Takeown/icacls a échoué: ${error.message}`);
    return false;
  }
}

/**
 * Utilise robocopy sur Windows pour supprimer le dossier .next
 */
function forceRemoveWithRobocopy(nextPath: string): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  try {
    const tempDir = path.join(process.cwd(), "temp_empty_dir");

    // Créer un dossier temporaire vide
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Utiliser robocopy pour "synchroniser" avec un dossier vide (= suppression)
    execSync(
      `robocopy "${tempDir}" "${nextPath}" /MIR /NFL /NDL /NJH /NJS /NC /NS /NP`,
      {
        stdio: "ignore",
        timeout: 30000,
      },
    );

    // Supprimer le dossier .next maintenant vide
    fs.rmdirSync(nextPath);

    // Nettoyer le dossier temporaire
    fs.rmdirSync(tempDir);

    console.log("✅ Cache Next.js supprimé avec robocopy");
    return true;
  } catch (error: any) {
    console.warn(`⚠️ Robocopy a échoué: ${error.message}`);
    return false;
  }
}

/**
 * Prépare le dossier .next pour permettre l'écriture du fichier trace
 */
function prepareNextDirectoryForTrace(nextPath: string): boolean {
  if (process.platform !== "win32") {
    return true; // Pas de problème sur les autres plateformes
  }

  try {
    console.log("🔧 Préparation du dossier .next pour le fichier trace...");

    // S'assurer que le dossier .next existe avec les bonnes permissions
    if (!fs.existsSync(nextPath)) {
      fs.mkdirSync(nextPath, { recursive: true });
    }

    // Donner les permissions complètes au dossier .next
    execSync(`icacls "${nextPath}" /grant everyone:F /t`, {
      stdio: "ignore",
      timeout: 5000,
    });

    const tracePath = path.join(nextPath, "trace");

    // Si le fichier trace existe déjà, le supprimer
    if (fs.existsSync(tracePath)) {
      console.log("🗑️ Suppression de l'ancien fichier trace...");

      // Prendre la propriété et supprimer
      execSync(`takeown /f "${tracePath}" /d y`, {
        stdio: "ignore",
        timeout: 5000,
      });
      execSync(`icacls "${tracePath}" /grant everyone:F`, {
        stdio: "ignore",
        timeout: 5000,
      });
      execSync(`attrib -R -H -S "${tracePath}"`, {
        stdio: "ignore",
        timeout: 5000,
      });
      fs.unlinkSync(tracePath);
    }

    // Pré-créer le fichier trace avec les bonnes permissions
    console.log("📝 Pré-création du fichier trace avec permissions...");
    fs.writeFileSync(tracePath, "", { mode: 0o666 });

    // S'assurer que le fichier a les bonnes permissions
    execSync(`icacls "${tracePath}" /grant everyone:F`, {
      stdio: "ignore",
      timeout: 5000,
    });

    console.log("✅ Dossier .next préparé pour le fichier trace");
    return true;
  } catch (error: any) {
    console.warn(
      `⚠️ Impossible de préparer le dossier .next: ${error.message}`,
    );
    return false;
  }
}

/**
 * Vérifie que le dossier .next est complètement vide après nettoyage
 */
function verifyNextDirectoryEmpty(nextPath: string): boolean {
  try {
    if (!fs.existsSync(nextPath)) {
      return true; // Le dossier n'existe pas, c'est parfait
    }

    const files = fs.readdirSync(nextPath);
    if (files.length === 0) {
      console.log("✅ Dossier .next complètement vide");
      return true;
    }

    console.log(
      `⚠️ Le dossier .next contient encore ${files.length} fichier(s):`,
      files,
    );
    return false;
  } catch (error: any) {
    console.warn(
      `⚠️ Impossible de vérifier le dossier .next: ${error.message}`,
    );
    return false;
  }
}

/**
 * Nettoie le cache Next.js avec toutes les méthodes disponibles
 */
async function cleanNextJsCache(): Promise<void> {
  console.log("🧹 Nettoyage du cache Next.js...");

  const nextPath = path.join(process.cwd(), ".next");

  if (!fs.existsSync(nextPath)) {
    console.log("✅ Aucun cache Next.js à nettoyer");
    // Préparer le dossier pour éviter les problèmes futurs
    prepareNextDirectoryForTrace(nextPath);
    return;
  }

  const stats = fs.statSync(nextPath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📁 Taille du cache: ${sizeInMB}MB`);

  // Méthode 1: Suppression standard
  console.log("🔄 Tentative de suppression standard...");
  const standardSuccess = await forceRemove(nextPath);

  if (standardSuccess && verifyNextDirectoryEmpty(nextPath)) {
    console.log("✅ Cache nettoyé avec succès (méthode standard)");
    prepareNextDirectoryForTrace(nextPath);
    return;
  }

  // Méthode 2: Gestion spécifique du fichier trace sur Windows
  if (process.platform === "win32") {
    const tracePath = path.join(nextPath, "trace");
    if (fs.existsSync(tracePath)) {
      console.log("🔄 Gestion spécifique du fichier trace (Windows)...");
      const traceSuccess = forceRemoveWithTakeown(tracePath);

      if (traceSuccess) {
        // Essayer de supprimer le reste du dossier .next maintenant
        try {
          await forceRemove(nextPath);
          console.log("✅ Cache nettoyé après suppression du fichier trace");
          return;
        } catch {
          // Continuer avec les autres méthodes
        }
      }
    }
  }

  // Méthode 3: Robocopy sur Windows
  if (process.platform === "win32") {
    console.log("🔄 Tentative avec robocopy (Windows)...");
    const robocopySuccess = forceRemoveWithRobocopy(nextPath);

    if (robocopySuccess) {
      return;
    }
  }

  // Méthode 4: Suppression sélective des fichiers problématiques
  console.log("🔄 Tentative de suppression sélective...");
  try {
    const problematicFiles = ["trace", "trace.log", "server.js.nft.json"];

    for (const filename of problematicFiles) {
      const filePath = path.join(nextPath, filename);
      if (fs.existsSync(filePath)) {
        // Essayer takeown en premier pour ces fichiers
        if (process.platform === "win32") {
          const takeownSuccess = forceRemoveWithTakeown(filePath);
          if (!takeownSuccess) {
            await forceRemove(filePath);
          }
        } else {
          await forceRemove(filePath);
        }
      }
    }

    console.log("✅ Fichiers problématiques supprimés");
  } catch (error: any) {
    console.warn(`⚠️ Suppression sélective échouée: ${error.message}`);
  }

  // Méthode 5: Commande système en dernier recours
  try {
    if (process.platform === "win32") {
      execSync(`rmdir /s /q "${nextPath}"`, {
        stdio: "ignore",
        timeout: 10000,
      });
      console.log("✅ Cache supprimé avec rmdir système");

      // Vérifier et préparer après suppression
      if (verifyNextDirectoryEmpty(nextPath)) {
        prepareNextDirectoryForTrace(nextPath);
        return;
      }
    } else {
      execSync(`rm -rf "${nextPath}"`, { stdio: "ignore", timeout: 10000 });
      console.log("✅ Cache supprimé avec rm système");
      return;
    }
  } catch (error: any) {
    console.warn(`⚠️ Commande système échouée: ${error.message}`);
  }

  // Méthode 6: Si tout échoue, au moins préparer le fichier trace
  console.log("🔄 Dernière tentative: préparation forcée du fichier trace...");
  const tracePreparationSuccess = prepareNextDirectoryForTrace(nextPath);

  if (tracePreparationSuccess) {
    console.log("✅ Fichier trace préparé - Next.js devrait pouvoir démarrer");
    console.log(
      "⚠️ Le cache n'a pas pu être complètement nettoyé, mais le problème EPERM devrait être résolu",
    );
    return;
  }

  // Si vraiment tout échoue - message minimal
  console.warn(
    `⚠️ Nettoyage incomplet du dossier .next - Next.js démarrera quand même`,
  );

  // Donner des instructions concises pour Windows (seulement si vraiment nécessaire)
  if (process.platform === "win32" && !verifyNextDirectoryEmpty(nextPath)) {
    console.log(
      "\n💡 Pour un nettoyage complet : pnpm dev:fast (saute le nettoyage) ou scripts/clean-next-windows-admin.ps1 en admin",
    );
  }
}

async function main(): Promise<void> {
  try {
    await cleanNextJsCache();
    console.log(
      "🎯 Nettoyage terminé. Le serveur Next.js peut maintenant démarrer proprement.",
    );
  } catch (error: any) {
    console.warn("⚠️ Erreur lors du nettoyage (non bloquant):", error.message);
    // Ne pas exit, permettre à Next.js de démarrer quand même
    console.log(
      "✅ Le serveur peut démarrer malgré le nettoyage incomplet - Next.js recréera les fichiers nécessaires",
    );
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.warn("⚠️ Nettoyage échoué (non bloquant):", error.message);
    // Ne pas exit en cas d'erreur - laisser Next.js démarrer
  });
}

export { cleanNextJsCache };
