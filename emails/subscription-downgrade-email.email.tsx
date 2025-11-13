import { SiteConfig } from "@/site-config";
import { Preview, Text } from "@react-email/components";
import { EmailLink, EmailSection, EmailText } from "./utils/components-utils";
import { EmailLayout } from "./utils/email-layout";

export default function SubscriptionDowngradeEmail({ url }: { url: string }) {
  return (
    <EmailLayout>
      <Preview>Votre accès Premium a été suspendu</Preview>
      <EmailSection>
        <EmailText>Bonjour,</EmailText>
        <EmailText>
          Nous vous contactons pour vous informer que votre compte est revenu à
          notre niveau d'accès de base. Ce changement est dû aux problèmes
          récents avec le paiement de votre abonnement premium.
        </EmailText>
        <EmailText>
          Bien que vous puissiez toujours profiter de nos services principaux,
          l'accès aux fonctionnalités premium est maintenant limité. Nous
          serions ravis de vous retrouver dans notre communauté premium !
        </EmailText>
        <EmailText>
          Pour réactiver votre statut premium, mettez simplement à jour vos
          informations de paiement ici :
        </EmailText>
        <EmailText>
          <EmailLink href={url}>
            👉 Cliquez pour mettre à jour le paiement et continuer à utiliser{" "}
            {SiteConfig.title} 👈
          </EmailLink>
        </EmailText>
        <EmailText>
          Si vous avez des questions ou besoin d'assistance, notre équipe est
          toujours là pour vous aider.
        </EmailText>
      </EmailSection>
      <Text className="text-lg leading-6">
        Cordialement,
        <br />- {SiteConfig.team.name} from {SiteConfig.title}
      </Text>
    </EmailLayout>
  );
}
