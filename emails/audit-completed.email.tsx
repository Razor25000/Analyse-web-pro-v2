import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from "@react-email/components";
import { EmailLayout } from "./utils/email-layout";

export type AuditCompletedEmailProps = {
  url: string;
  auditId: string;
  globalScore: number;
  scores: {
    performance: number;
    seo: number;
    security: number;
    modern: number;
  };
  reportUrl: string;
  dashboardUrl: string;
  userName?: string;
  completedAt: string;
};

export default function AuditCompletedEmail({
  url,
  auditId,
  globalScore,
  scores,
  reportUrl,
  dashboardUrl,
  userName,
  completedAt,
}: AuditCompletedEmailProps) {
  const previewText = `Votre audit pour ${url} est terminé ! Score global : ${globalScore}/100`;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#10b981"; // Green
    if (score >= 60) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 80) return "🎉";
    if (score >= 60) return "👍";
    return "⚠️";
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <EmailLayout>
          <Container style={container}>
            {/* Header */}
            <Section style={header}>
              <Heading style={h1}>
                {getScoreEmoji(globalScore)} Audit terminé !
              </Heading>
              <Text style={text}>
                {userName ? `Bonjour ${userName}, votre` : "Votre"} analyse est
                maintenant disponible.
              </Text>
            </Section>

            {/* Main Content */}
            <Section style={section}>
              {/* Audit Summary Card */}
              <div style={auditCard}>
                <div style={auditHeader}>
                  <Text style={auditUrl}>{url}</Text>
                  <div style={statusBadge}>Terminé</div>
                </div>

                <div style={auditMeta}>
                  <Text style={metaText}>ID: {auditId}</Text>
                  <Text style={metaText}>Terminé le {completedAt}</Text>
                </div>

                {/* Global Score */}
                <div style={globalScoreContainer}>
                  <div
                    style={{
                      ...(globalScore as any),
                      color: getScoreColor(globalScore),
                    }}
                  >
                    {globalScore}/100
                  </div>
                  <Text style={globalScoreLabel}>Score Global</Text>
                </div>
              </div>

              {/* Detailed Scores */}
              <div style={scoresContainer}>
                <Text style={scoresTitle}>Détail des scores :</Text>

                <div style={scoresList}>
                  <div style={scoreItem}>
                    <div style={scoreInfo}>
                      <div style={scoreIcon}>⚡</div>
                      <div>
                        <Text style={scoreLabel}>Performance</Text>
                        <Text style={scoreDesc}>Vitesse et optimisations</Text>
                      </div>
                    </div>
                    <div
                      style={{
                        ...scoreValue,
                        color: getScoreColor(scores?.performance || 0),
                      }}
                    >
                      {scores?.performance || 0}/100
                    </div>
                  </div>

                  <div style={scoreItem}>
                    <div style={scoreInfo}>
                      <div style={scoreIcon}>🔍</div>
                      <div>
                        <Text style={scoreLabel}>SEO</Text>
                        <Text style={scoreDesc}>Référencement naturel</Text>
                      </div>
                    </div>
                    <div
                      style={{
                        ...scoreValue,
                        color: getScoreColor(scores?.seo || 0),
                      }}
                    >
                      {scores?.seo || 0}/100
                    </div>
                  </div>

                  <div style={scoreItem}>
                    <div style={scoreInfo}>
                      <div style={scoreIcon}>🛡️</div>
                      <div>
                        <Text style={scoreLabel}>Sécurité</Text>
                        <Text style={scoreDesc}>HTTPS et protection</Text>
                      </div>
                    </div>
                    <div
                      style={{
                        ...scoreValue,
                        color: getScoreColor(scores?.security || 0),
                      }}
                    >
                      {scores?.security || 0}/100
                    </div>
                  </div>

                  <div style={scoreItem}>
                    <div style={scoreInfo}>
                      <div style={scoreIcon}>✨</div>
                      <div>
                        <Text style={scoreLabel}>Modernité</Text>
                        <Text style={scoreDesc}>Technologies modernes</Text>
                      </div>
                    </div>
                    <div
                      style={{
                        ...scoreValue,
                        color: getScoreColor(scores?.modern || 0),
                      }}
                    >
                      {scores?.modern || 0}/100
                    </div>
                  </div>
                </div>
              </div>

              <Text style={text}>
                Votre rapport détaillé contient des recommandations
                personnalisées pour améliorer chaque aspect de votre site web.
              </Text>
            </Section>

            {/* CTAs */}
            <Section style={buttonContainer}>
              <Button style={primaryButton} href={reportUrl}>
                📊 Voir le rapport complet
              </Button>
              <Button style={secondaryButton} href={dashboardUrl}>
                🏠 Accéder au dashboard
              </Button>
            </Section>

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>
                Besoin d'aide pour interpréter vos résultats ?
                <Link href="mailto:support@example.com" style={link}>
                  {" "}
                  Contactez notre équipe
                </Link>
                .
              </Text>
              <Text style={footerText}>
                Vous pouvez lancer de nouveaux audits à tout moment depuis votre
                dashboard.
              </Text>
            </Section>
          </Container>
        </EmailLayout>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const header = {
  padding: "32px 20px",
  textAlign: "center" as const,
};

const section = {
  padding: "0 20px",
};

const h1 = {
  color: "#1f2937",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.25",
  margin: "16px 0",
};

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "16px 0",
};

const auditCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "24px",
  margin: "24px 0",
  backgroundColor: "#f9fafb",
};

const auditHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const auditUrl = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0",
};

const statusBadge = {
  backgroundColor: "#10b981",
  color: "white",
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "500",
};

const auditMeta = {
  display: "flex",
  gap: "16px",
  marginBottom: "20px",
};

const metaText = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0",
};

const globalScoreContainer = {
  textAlign: "center" as const,
  padding: "20px",
  backgroundColor: "#fff",
  borderRadius: "8px",
  border: "2px solid #e5e7eb",
};

const globalScore = {
  fontSize: "32px",
  fontWeight: "700",
  margin: "0",
};

const globalScoreLabel = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "8px 0 0 0",
};

const scoresContainer = {
  margin: "32px 0",
};

const scoresTitle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 16px 0",
};

const scoresList = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "12px",
};

const scoreItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px",
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  border: "1px solid #f3f4f6",
};

const scoreInfo = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const scoreIcon = {
  fontSize: "18px",
  width: "28px",
  textAlign: "center" as const,
};

const scoreLabel = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0",
};

const scoreDesc = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "2px 0 0 0",
};

const scoreValue = {
  fontSize: "16px",
  fontWeight: "700",
};

const buttonContainer = {
  textAlign: "center" as const,
  padding: "32px 20px",
};

const primaryButton = {
  backgroundColor: "#3b82f6",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  margin: "0 8px 16px 8px",
};

const secondaryButton = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  color: "#374151",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  margin: "0 8px 16px 8px",
  border: "1px solid #d1d5db",
};

const footer = {
  borderTop: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "8px 0",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

export { AuditCompletedEmail };
