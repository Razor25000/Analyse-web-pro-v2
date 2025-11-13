import { SiteConfig } from "@/site-config";
import { Preview, Text } from "@react-email/components";
import { EmailSection, EmailText } from "./utils/components-utils";
import { EmailLayout } from "./utils/email-layout";

export default function SuccessUpgradeEmail() {
  return (
    <EmailLayout>
      <Preview>
        Vous avez mis à jour avec succès votre compte {SiteConfig.title}
      </Preview>
      <EmailSection>
        <EmailText>Bonjour,</EmailText>
        <EmailText>
          Excellente nouvelle ! Votre paiement a été traité avec succès et vous
          avez maintenant accès à toutes nos fonctionnalités premium.
          Préparez-vous à explorer tout ce que nous avons à vous offrir !
        </EmailText>
        <EmailText>
          Si vous avez des questions ou besoin d'assistance pendant votre
          exploration, n'hésitez pas à nous contacter. Nous sommes là pour vous
          aider à tirer le meilleur parti de votre expérience.
        </EmailText>
        <EmailText>Bonne exploration,</EmailText>
      </EmailSection>
      <Text className="text-lg leading-6">
        Cordialement,
        <br />- {SiteConfig.team.name} from {SiteConfig.title}
      </Text>
    </EmailLayout>
  );
}
