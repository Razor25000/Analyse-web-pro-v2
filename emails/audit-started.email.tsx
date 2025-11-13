import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Button,
} from "@react-email/components";
import { EmailLayout } from "./utils/email-layout";

export type AuditStartedEmailProps = {
  url: string;
  auditId: string;
  estimatedTime: string;
  dashboardUrl: string;
  userName?: string;
};

export default function AuditStartedEmail({
  url,
  auditId,
  estimatedTime = "3-5 minutes",
  dashboardUrl,
  userName,
}: AuditStartedEmailProps) {
  const previewText = `Votre audit pour ${url} a démarré avec succès`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <EmailLayout>
          <Container style={container}>
            {/* Header */}
            <Section style={header}>
              <Heading style={h1}>🚀 Audit en cours</Heading>
              <Text style={text}>
                {userName ? `Bonjour ${userName}, votre` : "Votre"} audit a
                démarré avec succès !
              </Text>
            </Section>

            {/* Main Content */}
            <Section style={section}>
              <div style={auditCard}>
                <div style={auditHeader}>
                  <Text style={auditUrl}>{url}</Text>
                  <div style={statusBadge}>En cours</div>
                </div>

                <div style={auditDetails}>
                  <div style={detailItem}>
                    <Text style={detailLabel}>ID de l'audit :</Text>
                    <Text style={detailValue}>{auditId}</Text>
                  </div>
                  <div style={detailItem}>
                    <Text style={detailLabel}>Temps estimé :</Text>
                    <Text style={detailValue}>{estimatedTime}</Text>
                  </div>
                </div>
              </div>

              <Text style={text}>
                Nous analysons actuellement votre site web sur 4 aspects clés :
              </Text>

              <div style={featuresList}>
                <div style={featureItem}>
                  <div style={featureIcon}>⚡</div>
                  <div>
                    <Text style={featureTitle}>Performance</Text>
                    <Text style={featureDesc}>
                      Vitesse et optimisations techniques
                    </Text>
                  </div>
                </div>
                <div style={featureItem}>
                  <div style={featureIcon}>🔍</div>
                  <div>
                    <Text style={featureTitle}>SEO</Text>
                    <Text style={featureDesc}>Référencement et balises</Text>
                  </div>
                </div>
                <div style={featureItem}>
                  <div style={featureIcon}>🛡️</div>
                  <div>
                    <Text style={featureTitle}>Sécurité</Text>
                    <Text style={featureDesc}>HTTPS et sécurisation</Text>
                  </div>
                </div>
                <div style={featureItem}>
                  <div style={featureIcon}>✨</div>
                  <div>
                    <Text style={featureTitle}>Modernité</Text>
                    <Text style={featureDesc}>Technologies et standards</Text>
                  </div>
                </div>
              </div>
            </Section>

            {/* CTA */}
            <Section style={buttonContainer}>
              <Button style={button} href={dashboardUrl}>
                Suivre l'analyse en temps réel
              </Button>
              <Text style={smallText}>
                Vous recevrez un autre email dès que l'analyse sera terminée.
              </Text>
            </Section>

            {/* Footer */}
            <Section style={footer}>
              <Text style={footerText}>
                Cet email a été envoyé automatiquement. Si vous avez des
                questions,
                <Link href="mailto:support@example.com" style={link}>
                  {" "}
                  contactez notre support
                </Link>
                .
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
  padding: "20px",
  margin: "24px 0",
  backgroundColor: "#f9fafb",
};

const auditHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "16px",
};

const auditUrl = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0",
};

const statusBadge = {
  backgroundColor: "#3b82f6",
  color: "white",
  padding: "4px 12px",
  borderRadius: "20px",
  fontSize: "12px",
  fontWeight: "500",
};

const auditDetails = {
  display: "flex",
  gap: "20px",
};

const detailItem = {
  flex: 1,
};

const detailLabel = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0 0 4px 0",
};

const detailValue = {
  fontSize: "14px",
  color: "#1f2937",
  fontWeight: "500",
  margin: "0",
};

const featuresList = {
  margin: "24px 0",
};

const featureItem = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "16px",
};

const featureIcon = {
  fontSize: "20px",
  width: "32px",
  textAlign: "center" as const,
};

const featureTitle = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 4px 0",
};

const featureDesc = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  padding: "32px 20px",
};

const button = {
  backgroundColor: "#3b82f6",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  margin: "0 0 16px 0",
};

const smallText = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "8px 0",
};

const footer = {
  borderTop: "1px solid #e5e7eb",
  padding: "20px",
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0",
};

const link = {
  color: "#3b82f6",
  textDecoration: "underline",
};

export { AuditStartedEmail };
