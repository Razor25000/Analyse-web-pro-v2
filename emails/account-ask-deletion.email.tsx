import { SiteConfig } from "@/site-config";
import { Preview, Text } from "@react-email/components";
import { EmailLink, EmailSection, EmailText } from "./utils/components-utils";
import { EmailLayout } from "./utils/email-layout";

export default function AccountAskDeletionEmail({
  organizationsToDelete,
  confirmUrl,
}: {
  organizationsToDelete: string[];
  confirmUrl: string;
}) {
  return (
    <EmailLayout>
      <Preview>
        Action requise : Vous devez confirmer la suppression de votre compte.
      </Preview>
      <EmailSection>
        <EmailText>Bonjour,</EmailText>
        <EmailText>
          Vous avez demandé la suppression de votre compte. La suppression n'est
          pas encore effective. Veuillez confirmer votre demande en cliquant sur
          le lien ci-dessous :
        </EmailText>
        <EmailText>
          <EmailLink href={confirmUrl}>
            👉 Confirmer la suppression du compte 👈
          </EmailLink>
        </EmailText>
        <EmailText>
          Vous avez 1 heure pour confirmer votre demande. Après, la demande sera
          invalide.
        </EmailText>
        {organizationsToDelete && organizationsToDelete.length > 0 && (
          <EmailText>
            Les organisations suivantes seront également supprimées :
            <ul>
              {organizationsToDelete.map((org) => (
                <li key={org}>{org}</li>
              ))}
            </ul>
          </EmailText>
        )}
      </EmailSection>
      <Text className="text-lg leading-6">
        Cordialement,
        <br />- {SiteConfig.team.name} from {SiteConfig.title}
      </Text>
    </EmailLayout>
  );
}
