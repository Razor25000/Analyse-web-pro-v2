import { SiteConfig } from "@/site-config";
import { Preview } from "@react-email/components";
import { EmailLink, EmailSection, EmailText } from "./utils/components-utils";
import { EmailLayout } from "./utils/email-layout";

export default function MagicLinkMail({ url }: { url: string }) {
  return (
    <EmailLayout>
      <Preview>
        Vous avez demandé un lien magique pour vous connecter à votre compte.
      </Preview>
      <EmailSection>
        <EmailText>Bonjour,</EmailText>
        <EmailText>Vous avez demandé un lien magique :</EmailText>
        <EmailText>
          <EmailLink href={url}>Cliquez ici pour vous connecter</EmailLink>
        </EmailText>
        <EmailText>
          Si vous n'avez pas fait cette demande, veuillez ignorer cet email.
        </EmailText>
      </EmailSection>
      <EmailText>
        Cordialement,
        <br />- {SiteConfig.team.name} from {SiteConfig.title}
      </EmailText>
    </EmailLayout>
  );
}
