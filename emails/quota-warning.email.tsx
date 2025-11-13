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

export type QuotaWarningEmailProps = {
  userName?: string;
  usedQuota: number;
  totalQuota: number;
  remainingQuota: number;
  planName: string;
  upgradeUrl: string;
  dashboardUrl: string;
  warningType: "80_percent" | "90_percent" | "quota_exceeded";
};

export default function QuotaWarningEmail({
  userName,
  usedQuota,
  totalQuota,
  remainingQuota,
  planName,
  upgradeUrl,
  dashboardUrl,
  warningType,
}: QuotaWarningEmailProps) {
  const getWarningConfig = () => {
    switch (warningType) {
      case "80_percent":
        return {
          title: "⚠️ Quota bientôt atteint",
          emoji: "⚠️",
          message: "Vous avez utilisé 80% de votre quota mensuel.",
          urgency: "Pensez à upgrader avant d'atteindre la limite !",
          color: "#f59e0b",
        };
      case "90_percent":
        return {
          title: "🚨 Quota presque épuisé",
          emoji: "🚨",
          message: "Attention ! Vous avez utilisé 90% de votre quota mensuel.",
          urgency: "Upgradez maintenant pour continuer vos analyses !",
          color: "#ef4444",
        };
      case "quota_exceeded":
        return {
          title: "🛑 Quota épuisé",
          emoji: "🛑",
          message: "Vous avez atteint votre limite mensuelle d'audits.",
          urgency: "Upgradez votre plan pour continuer vos analyses.",
          color: "#dc2626",
        };
    }
  };

  const config = getWarningConfig();
  const percentageUsed = Math.round((usedQuota / totalQuota) * 100);

  const previewText = `${config?.title || "Alerte quota"} - ${percentageUsed}% utilisé (${usedQuota}/${totalQuota})`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <EmailLayout>
          <Container style={container}>
            {/* Header */}
            <Section style={header}>
              <Heading style={h1}>{config?.title || "Alerte quota"}</Heading>
              <Text style={text}>
                {userName ? `Bonjour ${userName}` : "Bonjour"}, votre quota
                d'audits nécessite votre attention.
              </Text>
            </Section>

            {/* Warning Card */}
            <Section style={section}>
              <div
                style={{
                  ...warningCard,
                  borderColor: config?.color || "#f59e0b",
                }}
              >
                <div style={warningHeader}>
                  <div style={warningIcon}>{config?.emoji || "⚠️"}</div>
                  <Text style={warningMessage}>
                    {config?.message || "Quota nécessite attention"}
                  </Text>
                </div>

                {/* Quota Progress */}
                <div style={quotaContainer}>
                  <div style={quotaHeader}>
                    <Text style={quotaLabel}>Utilisation actuelle</Text>
                    <Text style={quotaPercentage}>{percentageUsed}%</Text>
                  </div>

                  <div style={progressBar}>
                    <div
                      style={{
                        ...progressFill,
                        width: `${percentageUsed}%`,
                        backgroundColor: config?.color || "#f59e0b",
                      }}
                    />
                  </div>

                  <div style={quotaStats}>
                    <Text style={quotaStat}>
                      <span style={statNumber}>{usedQuota}</span> utilisés
                    </Text>
                    <Text style={quotaStat}>
                      <span style={statNumber}>{remainingQuota}</span> restants
                    </Text>
                    <Text style={quotaStat}>
                      <span style={statNumber}>{totalQuota}</span> total
                    </Text>
                  </div>
                </div>

                <div style={planInfo}>
                  <Text style={planText}>
                    Plan actuel : <strong>{planName}</strong>
                  </Text>
                  <Text style={urgencyText}>
                    {config?.urgency || "Pensez à upgrader votre plan"}
                  </Text>
                </div>
              </div>

              {/* Benefits of upgrading */}
              <div style={benefitsContainer}>
                <Text style={benefitsTitle}>
                  Avec un plan supérieur, obtenez :
                </Text>

                <div style={benefitsList}>
                  <div style={benefitItem}>
                    <div style={benefitIcon}>📊</div>
                    <Text style={benefitText}>Plus d'audits par mois</Text>
                  </div>
                  <div style={benefitItem}>
                    <div style={benefitIcon}>⚡</div>
                    <Text style={benefitText}>Analyses prioritaires</Text>
                  </div>
                  <div style={benefitItem}>
                    <div style={benefitIcon}>📈</div>
                    <Text style={benefitText}>Rapports détaillés</Text>
                  </div>
                  <div style={benefitItem}>
                    <div style={benefitIcon}>🎯</div>
                    <Text style={benefitText}>
                      Recommandations personnalisées
                    </Text>
                  </div>
                </div>
              </div>

              {warningType !== "quota_exceeded" && (
                <Text style={reminderText}>
                  💡 <strong>Astuce :</strong> Votre quota se renouvelle
                  automatiquement le premier jour de chaque mois.
                </Text>
              )}
            </Section>

            {/* CTAs */}
            <Section style={buttonContainer}>
              <Button style={primaryButton} href={upgradeUrl}>
                🚀 Upgrader maintenant
              </Button>
              <Button style={secondaryButton} href={dashboardUrl}>
                📊 Voir mon dashboard
              </Button>
            </Section>

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>
                Questions sur les plans ?
                <Link href="mailto:support@example.com" style={link}>
                  {" "}
                  Contactez notre équipe
                </Link>
                .
              </Text>
              <Text style={footerText}>
                Vous recevez cet email car votre quota nécessite une attention.
                Vous pouvez gérer vos notifications dans vos paramètres.
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

const warningCard = {
  border: "2px solid",
  borderRadius: "12px",
  padding: "24px",
  margin: "24px 0",
  backgroundColor: "#fef7f0",
};

const warningHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "20px",
};

const warningIcon = {
  fontSize: "24px",
};

const warningMessage = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0",
};

const quotaContainer = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "8px",
  margin: "16px 0",
};

const quotaHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const quotaLabel = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0",
};

const quotaPercentage = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#1f2937",
  margin: "0",
};

const progressBar = {
  width: "100%",
  height: "8px",
  backgroundColor: "#e5e7eb",
  borderRadius: "4px",
  overflow: "hidden",
  marginBottom: "12px",
};

const progressFill = {
  height: "100%",
  borderRadius: "4px",
  transition: "width 0.3s ease",
};

const quotaStats = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const quotaStat = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0",
};

const statNumber = {
  fontWeight: "600",
  color: "#1f2937",
};

const planInfo = {
  textAlign: "center" as const,
  marginTop: "16px",
};

const planText = {
  fontSize: "14px",
  color: "#374151",
  margin: "0 0 8px 0",
};

const urgencyText = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#dc2626",
  margin: "0",
};

const benefitsContainer = {
  margin: "32px 0",
  padding: "20px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
};

const benefitsTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 16px 0",
};

const benefitsList = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const benefitItem = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const benefitIcon = {
  fontSize: "16px",
};

const benefitText = {
  fontSize: "14px",
  color: "#374151",
  margin: "0",
};

const reminderText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "24px 0 0 0",
  padding: "16px",
  backgroundColor: "#eff6ff",
  borderRadius: "6px",
  borderLeft: "4px solid #3b82f6",
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

export { QuotaWarningEmail };
