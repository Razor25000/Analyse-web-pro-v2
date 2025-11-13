import { SiteConfig } from "@/site-config";
import { Preview, Text } from "@react-email/components";
import { EmailSection, EmailText } from "./utils/components-utils";
import { EmailLayout } from "./utils/email-layout";

export default function AccountConfirmDeletionEmail() {
  return (
    <EmailLayout>
      <Preview>
        Votre compte a été supprimé. Toutes vos données, y compris les
        organisations que vous possédiez, ont été supprimées de notre système.
      </Preview>
      <EmailSection>
        <EmailText>Bonjour,</EmailText>
        <EmailText>
          Nous tenions à vous informer que votre compte a été définitivement
          supprimé. Toutes vos données, y compris les organisations que vous
          possédiez, ont été supprimées de notre système.
        </EmailText>
        <EmailText>
          Si vous avez des questions ou besoin d'assistance supplémentaire,
          n'hésitez pas à contacter notre équipe de support.
        </EmailText>
      </EmailSection>
      <Text className="text-lg leading-6">
        Cordialement,
        <br />- {SiteConfig.team.name} from {SiteConfig.title}
      </Text>
    </EmailLayout>
  );
}
