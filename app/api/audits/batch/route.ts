import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getRequiredUser } from "@/lib/auth/auth-user";
import { requirePlan } from "@/lib/auth/user-plan";
import { prisma } from "@/lib/prisma";
import { QuotaService } from "@/lib/quota/quota-service";
import { n8nClient } from "@/lib/n8n/client";

// Schéma de validation
const BatchAuditSchema = z.object({
  csvData: z.string().min(10, "CSV trop court"),
  batchName: z.string().optional(),
});

const MAX_BATCH_SIZE = 50;

type ParsedCsvItem = {
  url: string;
  email: string;
};

type ParsedCsvResult = {
  items: ParsedCsvItem[];
  invalidRows: number;
  duplicateRows: number;
};

class CsvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvValidationError";
  }
}

const detectDelimiter = (headerLine: string): "," | ";" => {
  const commaCount = headerLine.split(",").length;
  const semicolonCount = headerLine.split(";").length;
  return semicolonCount > commaCount ? ";" : ",";
};

const splitCsvLine = (line: string, delimiter: "," | ";"): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeUrl = (rawUrl: string): string | null => {
  if (!rawUrl) {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return null;
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    url.hash = "";

    // Normaliser l'URL en supprimant le slash de fin par défaut
    const normalized = url.toString().replace(/\/$/, "");
    return normalized;
  } catch {
    return null;
  }
};

const buildFallbackEmail = (urlString: string): string => {
  try {
    const hostname = new URL(urlString).hostname.replace(/^www\./, "");
    return `contact@${hostname}`;
  } catch {
    return "contact@example.com";
  }
};

const parseCsvData = (csvInput: string): ParsedCsvResult => {
  const sanitizedCsv = csvInput.replace(/\uFEFF/g, "");
  const lines = sanitizedCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new CsvValidationError(
      "Le fichier CSV doit contenir une ligne d'en-tête et au moins une ligne de données",
    );
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) =>
    h.replace(/\"/g, "").trim().toLowerCase(),
  );

  if (!headers.includes("url")) {
    throw new CsvValidationError(
      'Le fichier CSV doit contenir une colonne "url"',
    );
  }

  const urlIndex = headers.indexOf("url");
  const emailIndex = headers.indexOf("email");

  const items: ParsedCsvItem[] = [];
  let invalidRows = 0;
  let duplicateRows = 0;
  const seenUrls = new Set<string>();

  lines.slice(1).forEach((line) => {
    const values = splitCsvLine(line, delimiter);
    const rawUrl = values[urlIndex] ?? "";
    const normalizedUrl = normalizeUrl(rawUrl);

    if (!normalizedUrl) {
      invalidRows += 1;
      return;
    }

    // Éviter les doublons d'URL dans le batch
    if (seenUrls.has(normalizedUrl)) {
      duplicateRows += 1;
      return;
    }

    seenUrls.add(normalizedUrl);

    const emailValue =
      emailIndex >= 0 ? (values[emailIndex]?.trim() ?? "") : "";
    const email = emailValue || buildFallbackEmail(normalizedUrl);

    items.push({
      url: normalizedUrl,
      email,
    });
  });

  if (items.length === 0) {
    throw new CsvValidationError(
      "Aucune URL valide détectée dans le fichier CSV",
    );
  }

  if (items.length > MAX_BATCH_SIZE) {
    throw new CsvValidationError(
      `Maximum ${MAX_BATCH_SIZE} sites autorisés par batch`,
    );
  }

  return {
    items,
    invalidRows,
    duplicateRows,
  };
};

export async function POST(request: NextRequest) {
  try {
    logger.info("API Batch audit appelée");

    // 1. Vérifier l'authentification
    const user = await getRequiredUser();
    logger.info("Utilisateur authentifié pour batch audit", {
      email: user.email,
    });

    // 2. Vérifier le plan Premium/Enterprise
    const hasPremiumAccess = await requirePlan("premium");

    if (!hasPremiumAccess) {
      logger.warn("Accès batch refusé - plan insuffisant", {
        email: user.email,
        requiredPlan: "premium",
      });

      return NextResponse.json(
        {
          error: "Fonctionnalité réservée au plan Premium",
          requiredPlan: "premium",
          message:
            "Les audits batch sont exclusifs au plan Premium (100€/mois)",
          upgradeUrl: "/pricing",
        },
        { status: 403 },
      );
    }

    // 3. Valider les données
    const body = await request.json();
    const validatedData = BatchAuditSchema.parse(body);
    const trimmedBatchName = validatedData.batchName?.trim() || undefined;

    logger.info("Données batch validées", {
      email: user.email,
      csvLength: validatedData.csvData.length,
      batchName: trimmedBatchName,
    });

    // 4. Parser le CSV et préparer les audits
    const parsedCsv = parseCsvData(validatedData.csvData);

    logger.info("CSV batch analysé", {
      email: user.email,
      totalProspects: parsedCsv.items.length,
      invalidRows: parsedCsv.invalidRows,
      duplicateRows: parsedCsv.duplicateRows,
    });

    // 5. Vérifier le quota disponible
    const quotaInfo = await QuotaService.getUserQuota(user.id);
    if (!quotaInfo) {
      logger.error("Impossible de récupérer les informations de quota", {
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Erreur lors de la vérification du quota" },
        { status: 500 },
      );
    }

    if (quotaInfo.remaining < parsedCsv.items.length) {
      logger.warn("Quota insuffisant pour batch audit", {
        email: user.email,
        requested: parsedCsv.items.length,
        remaining: quotaInfo.remaining,
      });

      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: "Quota d'audits insuffisant pour ce batch",
          remaining: quotaInfo.remaining,
          required: parsedCsv.items.length,
          redirectTo: "/pricing",
        },
        { status: 403 },
      );
    }

    const batchCorrelationId = `batch_${nanoid(12)}`;
    const auditRows = parsedCsv.items.map((item, index) => ({
      userId: user.id,
      email: item.email,
      url: item.url,
      status: "pending",
      auditType: "batch_analysis",
      webhookId: `${batchCorrelationId}_${index + 1}`,
      orgId: null,
    }));

    let createdAudits: { id: string; webhookId: string; url: string }[] = [];
    let databaseDuplicateCount = 0;

    try {
      createdAudits = await prisma.$transaction(async (tx) => {
        // Check for existing audits in database to prevent duplicates
        const existingAudits = await tx.audit.findMany({
          where: {
            userId: user.id,
            url: {
              in: auditRows.map((row) => row.url),
            },
          },
          select: { url: true },
        });

        // Filter out database duplicates
        const existingUrls = new Set(existingAudits.map((audit) => audit.url));
        const newAuditRows = auditRows.filter(
          (row) => !existingUrls.has(row.url),
        );
        databaseDuplicateCount = auditRows.length - newAuditRows.length;

        logger.info("Vérification des doublons en base", {
          email: user.email,
          totalCsvItems: auditRows.length,
          existingInDatabase: databaseDuplicateCount,
          newAuditsToCreate: newAuditRows.length,
        });

        // Skip transaction if no new audits to create
        if (newAuditRows.length === 0) {
          logger.warn("Aucun nouvel audit à créer - tous sont des doublons", {
            email: user.email,
            totalDuplicates: databaseDuplicateCount,
          });
          return [];
        }

        const quotaUpdate = await tx.user.updateMany({
          where: {
            id: user.id,
            quotaUsed: {
              lte: quotaInfo.limit - newAuditRows.length,
            },
          },
          data: {
            quotaUsed: {
              increment: newAuditRows.length,
            },
            updatedAt: new Date(),
          },
        });

        if (quotaUpdate.count === 0) {
          throw new CsvValidationError(
            "Quota insuffisant pour lancer ce batch",
          );
        }

        await tx.audit.createMany({ data: newAuditRows });

        const storedAudits = await tx.audit.findMany({
          where: {
            webhookId: {
              in: newAuditRows.map((item) => item.webhookId),
            },
          },
          select: {
            id: true,
            webhookId: true,
            url: true,
          },
        });

        return storedAudits;
      });
    } catch (transactionError) {
      if (transactionError instanceof CsvValidationError) {
        return NextResponse.json(
          {
            error: "quota_exceeded",
            message: transactionError.message,
            remaining: quotaInfo.remaining,
            required: parsedCsv.items.length,
          },
          { status: 403 },
        );
      }

      logger.error("Erreur lors de la transaction batch", {
        error:
          transactionError instanceof Error
            ? transactionError.message
            : String(transactionError),
      });

      throw transactionError;
    }

    // 6. Préparer les payloads d'audits pour n8n avec les emails du CSV
    const auditPayloads = createdAudits.map((audit) => {
      const csvItem = parsedCsv.items.find((item) => item.url === audit.url);
      return {
        id: audit.id,
        webhookId: audit.webhookId,
        url: audit.url,
        email: csvItem?.email || buildFallbackEmail(audit.url),
        userId: user.id,
      };
    });

    // 7. Déclencher le workflow n8n avec les audits pré-créés
    let n8nTriggered = false;
    let webhookUsed: string | undefined;
    let n8nErrorMessage: string | undefined;

    try {
      const n8nResult = await n8nClient.triggerBatchAudit({
        audits: auditPayloads,
        userId: user.id,
        batchName: trimmedBatchName,
        correlationId: batchCorrelationId,
        planId: quotaInfo.planId,
      });

      n8nTriggered = true;
      webhookUsed = n8nResult.webhookUsed;

      await prisma.audit.updateMany({
        where: {
          id: {
            in: createdAudits.map((audit) => audit.id),
          },
        },
        data: {
          status: "processing",
        },
      });
    } catch (n8nError) {
      n8nErrorMessage =
        n8nError instanceof Error ? n8nError.message : String(n8nError);
      logger.error("Erreur lors du déclenchement du batch n8n", {
        userId: user.id,
        batchCorrelationId,
        error: n8nErrorMessage,
      });
    }

    const updatedQuotaInfo = await QuotaService.getUserQuota(user.id);
    const estimatedMinutes = Math.max(
      5,
      Math.ceil(parsedCsv.items.length * 2.5),
    );

    logger.info("Batch audit traité avec succès", {
      email: user.email,
      batchId: batchCorrelationId,
      batchName: trimmedBatchName,
      totalProspects: parsedCsv.items.length,
      invalidRows: parsedCsv.invalidRows,
      duplicateRows: parsedCsv.duplicateRows,
      n8nTriggered,
    });

    return NextResponse.json({
      success: true,
      batchId: batchCorrelationId,
      message: "Audits batch lancés avec succès",
      batchName: trimmedBatchName,
      status: n8nTriggered ? "processing" : "pending",
      totalProspects: parsedCsv.items.length,
      createdAuditIds: createdAudits.map((audit) => audit.id),
      invalidRows: parsedCsv.invalidRows,
      duplicateRows: parsedCsv.duplicateRows,
      databaseDuplicateRows: databaseDuplicateCount,
      n8nTriggered,
      webhookUsed,
      n8nError: n8nErrorMessage,
      estimatedCompletionTime: `${estimatedMinutes} minutes`,
      quota: updatedQuotaInfo
        ? {
            used: updatedQuotaInfo.used,
            total: updatedQuotaInfo.limit,
            remaining: updatedQuotaInfo.remaining,
          }
        : undefined,
    });
  } catch (error) {
    logger.error("Erreur API batch audit", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    if (error instanceof CsvValidationError) {
      return NextResponse.json(
        {
          error: "invalid_csv",
          message: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Erreur lors du traitement des audits batch" },
      { status: 500 },
    );
  }
}
