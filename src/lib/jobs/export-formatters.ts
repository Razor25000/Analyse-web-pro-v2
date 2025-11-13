import type { ExportConfig } from "@/components/nowts/export-audit-modal";

// Function to convert an audit to HTML
export function auditToHtml(audit: any): string {
  const scores = {
    performance: audit.scorePerformance || 0,
    seo: audit.scoreSeo || 0,
    security: audit.scoreSecurity || 0,
    modernity: audit.scoreModern || 0,
    global: audit.scoreGlobal || 0,
  };

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Audit - ${audit.url}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 20px; }
        .score { font-size: 18px; font-weight: bold; margin: 10px 0; }
        .score-excellent { color: #10b981; }
        .score-good { color: #22c55e; }
        .score-average { color: #f59e0b; }
        .score-poor { color: #ef4444; }
        .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .content { margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Rapport d'Audit</h1>
        <p><strong>URL:</strong> ${audit.url}</p>
        <p><strong>Email:</strong> ${audit.email}</p>
        <p><strong>Date:</strong> ${new Date(audit.createdAt).toLocaleString('fr-FR')}</p>
        <p><strong>Status:</strong> ${audit.status}</p>
      </div>

      <div class="score">
        <p class="score ${
          scores.global >= 90 ? 'score-excellent' :
          scores.global >= 70 ? 'score-good' :
          scores.global >= 50 ? 'score-average' : 'score-poor'
        }">
          Score Global: ${scores.global}/100
        </p>
        <p><em>Détails: Performance ${scores.performance}/100 | SEO ${scores.seo}/100 | Sécurité ${scores.security}/100 | Modernité ${scores.modernity}/100</em></p>
      </div>

      <div class="metadata">
        <h3>Métadonnées</h3>
        <p><strong>ID:</strong> ${audit.id}</p>
        <p><strong>Type d'audit:</strong> ${audit.auditType}</p>
        <p><strong>Webhook ID:</strong> ${audit.webhookId || 'N/A'}</p>
        <p><strong>Créé le:</strong> ${new Date(audit.createdAt).toLocaleString('fr-FR')}</p>
        <p><strong>Terminé le:</strong> ${audit.completedAt ? new Date(audit.completedAt).toLocaleString('fr-FR') : 'En cours'}</p>
      </div>

      <div class="content">
        ${audit.htmlReport || 'Aucun contenu disponible'}
      </div>
    </body>
    </html>
  `;
}

// Function to convert an audit to JSON
export function auditToJson(audit: any, config: ExportConfig): any {
  const baseData = {
    id: audit.id,
    url: audit.url,
    email: audit.email,
    status: audit.status,
    scoreGlobal: audit.scoreGlobal,
    scorePerformance: audit.scorePerformance,
    scoreSeo: audit.scoreSeo,
    scoreSecurity: audit.scoreSecurity,
    scoreModern: audit.scoreModern,
    resultsJson: audit.resultsJson,
    createdAt: audit.createdAt,
    completedAt: audit.completedAt,
    auditType: audit.auditType,
    webhookId: audit.webhookId,
  };

  if (config.includeMetadata) {
    return {
      ...baseData,
      metadata: {
        userId: audit.userId,
        orgId: audit.orgId,
        processedAt: new Date().toISOString(),
        exportConfig: config,
      },
    };
  }

  return baseData;
}

// Function to convert an audit to CSV
export function auditToCsv(audit: any): string {
  const scores = {
    performance: audit.scorePerformance || 0,
    seo: audit.scoreSeo || 0,
    security: audit.scoreSecurity || 0,
    modernity: audit.scoreModern || 0,
    global: audit.scoreGlobal || 0,
  };

  return [
    audit.id,
    audit.url,
    audit.email,
    audit.status,
    scores.global,
    scores.performance,
    scores.seo,
    scores.security,
    scores.modernity,
    new Date(audit.createdAt).toISOString(),
    audit.completedAt ? new Date(audit.completedAt).toISOString() : '',
    audit.auditType,
    audit.webhookId || '',
  ].join(',');
}

// CSV Header for exports
export const CSV_HEADER = [
  'ID',
  'URL',
  'Email',
  'Status',
  'Score Global',
  'Performance',
  'SEO',
  'Sécurité',
  'Modernité',
  'Date de Création',
  'Date de Fin',
  "Type d'Audit",
  'Webhook ID'
].join(',');