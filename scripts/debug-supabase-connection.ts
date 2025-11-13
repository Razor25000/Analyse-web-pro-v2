/**
 * Script de diagnostic Supabase
 * Identifie les problèmes précis avec la configuration et connexion Supabase
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

type DiagnosticResult = {
  step: string;
  success: boolean;
  message: string;
  details?: any;
};

class SupabaseDiagnostic {
  private readonly results: DiagnosticResult[] = [];

  private log(step: string, success: boolean, message: string, details?: any) {
    const result = { step, success, message, details };
    this.results.push(result);

    const status = success ? "✅" : "❌";
    console.log(`${status} ${step}: ${message}`);
    if (details && !success) {
      console.log("   Details:", details);
    }
  }

  async runDiagnostics() {
    console.log("🔍 Diagnostic de la connexion Supabase\n");

    // Étape 1: Vérifier les variables d'environnement
    await this.checkEnvironmentVariables();

    // Étape 2: Tester la connexion client anonyme
    await this.testAnonConnection();

    // Étape 3: Tester la connexion admin
    await this.testAdminConnection();

    // Étape 4: Vérifier l'existence des tables
    await this.checkTables();

    // Étape 5: Tester les opérations CRUD de base
    await this.testBasicOperations();

    // Afficher le résumé
    this.showSummary();
  }

  private async checkEnvironmentVariables() {
    const requiredEnvs = [
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_KEY",
    ];

    for (const env of requiredEnvs) {
      const value = process.env[env];
      if (!value) {
        this.log(`Env ${env}`, false, `Variable d'environnement manquante`);
      } else {
        // Vérifier le format de l'URL
        if (env === "SUPABASE_URL") {
          try {
            new URL(value);
            this.log(
              `Env ${env}`,
              true,
              `URL valide: ${value.substring(0, 30)}...`,
            );
          } catch {
            this.log(`Env ${env}`, false, `URL invalide: ${value}`);
          }
        } else {
          // Masquer les clés sensibles
          this.log(
            `Env ${env}`,
            true,
            `Clé présente: ${value.substring(0, 10)}...${value.substring(value.length - 4)}`,
          );
        }
      }
    }
  }

  private async testAnonConnection() {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      this.log(
        "Test connexion anonyme",
        false,
        "Variables d'environnement manquantes",
      );
      return;
    }

    try {
      const client = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Test simple: obtenir la version
      const { data, error } = await client
        .from("audits")
        .select("count(*)")
        .limit(1);

      if (error) {
        this.log(
          "Test connexion anonyme",
          false,
          `Erreur de connexion: ${error.message}`,
          error,
        );
      } else {
        this.log("Test connexion anonyme", true, "Connexion réussie");
      }
    } catch (error: any) {
      this.log(
        "Test connexion anonyme",
        false,
        `Exception: ${error.message}`,
        error,
      );
    }
  }

  private async testAdminConnection() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !serviceKey) {
      this.log(
        "Test connexion admin",
        false,
        "Variables d'environnement manquantes",
      );
      return;
    }

    try {
      const adminClient = createClient(url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Test avec privilèges admin
      const { data, error } = await adminClient
        .from("audits")
        .select("count(*)")
        .limit(1);

      if (error) {
        this.log(
          "Test connexion admin",
          false,
          `Erreur de connexion admin: ${error.message}`,
          error,
        );
      } else {
        this.log("Test connexion admin", true, "Connexion admin réussie");
      }
    } catch (error: any) {
      this.log(
        "Test connexion admin",
        false,
        `Exception admin: ${error.message}`,
        error,
      );
    }
  }

  private async checkTables() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !serviceKey) {
      this.log(
        "Vérification tables",
        false,
        "Impossible de créer le client admin",
      );
      return;
    }

    try {
      const adminClient = createClient(url, serviceKey);

      const requiredTables = ["profiles", "audits", "subscribers"];

      for (const tableName of requiredTables) {
        try {
          const { data, error } = await adminClient
            .from(tableName)
            .select("*")
            .limit(1);

          if (error) {
            this.log(
              `Table ${tableName}`,
              false,
              `Erreur d'accès: ${error.message}`,
              error,
            );
          } else {
            this.log(`Table ${tableName}`, true, `Table accessible`);
          }
        } catch (error: any) {
          this.log(
            `Table ${tableName}`,
            false,
            `Exception: ${error.message}`,
            error,
          );
        }
      }
    } catch (error: any) {
      this.log(
        "Vérification tables",
        false,
        `Exception générale: ${error.message}`,
        error,
      );
    }
  }

  private async testBasicOperations() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !serviceKey) {
      this.log(
        "Test opérations CRUD",
        false,
        "Variables d'environnement manquantes",
      );
      return;
    }

    try {
      const adminClient = createClient(url, serviceKey);

      // Test d'insertion dans profiles
      const testUserId = `test-user-${Date.now()}`;
      const testEmail = `test-${Date.now()}@example.com`;

      const { data: insertData, error: insertError } = await adminClient
        .from("profiles")
        .insert({
          user_id: testUserId,
          email: testEmail,
          full_name: "Test User",
        })
        .select()
        .single();

      if (insertError) {
        this.log(
          "Test INSERT profiles",
          false,
          `Erreur d'insertion: ${insertError.message}`,
          insertError,
        );
        return;
      }

      this.log(
        "Test INSERT profiles",
        true,
        `Profile créé avec ID: ${insertData?.id}`,
      );

      // Test de lecture
      const { data: selectData, error: selectError } = await adminClient
        .from("profiles")
        .select("*")
        .eq("user_id", testUserId)
        .single();

      if (selectError) {
        this.log(
          "Test SELECT profiles",
          false,
          `Erreur de lecture: ${selectError.message}`,
          selectError,
        );
      } else {
        this.log(
          "Test SELECT profiles",
          true,
          `Profile lu: ${selectData?.email}`,
        );
      }

      // Nettoyage: supprimer le test
      const { error: deleteError } = await adminClient
        .from("profiles")
        .delete()
        .eq("user_id", testUserId);

      if (deleteError) {
        this.log(
          "Nettoyage test",
          false,
          `Erreur de suppression: ${deleteError.message}`,
          deleteError,
        );
      } else {
        this.log("Nettoyage test", true, `Profile test supprimé`);
      }
    } catch (error: any) {
      this.log(
        "Test opérations CRUD",
        false,
        `Exception: ${error.message}`,
        error,
      );
    }
  }

  private showSummary() {
    console.log("\n📊 RÉSUMÉ DU DIAGNOSTIC");
    console.log(`=${"=".repeat(50)}`);

    const successCount = this.results.filter((r) => r.success).length;
    const totalCount = this.results.length;

    console.log(`✅ Tests réussis: ${successCount}/${totalCount}`);
    console.log(`❌ Tests échoués: ${totalCount - successCount}/${totalCount}`);

    const failures = this.results.filter((r) => !r.success);
    if (failures.length > 0) {
      console.log("\n🚨 PROBLÈMES IDENTIFIÉS:");
      failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.step}: ${failure.message}`);
      });
    }

    console.log("\n🔧 RECOMMANDATIONS:");

    if (failures.some((f) => f.step.includes("Env"))) {
      console.log(
        "- Vérifiez vos variables d'environnement Supabase dans .env.local",
      );
      console.log(
        "- Assurez-vous que SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_KEY sont corrects",
      );
    }

    if (failures.some((f) => f.step.includes("connexion"))) {
      console.log("- Vérifiez que votre projet Supabase est actif");
      console.log("- Régénérez vos clés API si nécessaire");
    }

    if (failures.some((f) => f.step.includes("Table"))) {
      console.log("- Créez les tables manquantes dans votre base Supabase");
      console.log("- Vérifiez les permissions RLS (Row Level Security)");
    }
  }
}

// Exécuter le diagnostic
async function main() {
  const diagnostic = new SupabaseDiagnostic();
  await diagnostic.runDiagnostics();
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  main().catch(console.error);
}
