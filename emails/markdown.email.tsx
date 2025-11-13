import { SiteConfig } from "@/site-config";
import { Markdown, Preview } from "@react-email/components";
import { EmailLayout } from "./utils/email-layout";

export default function MarkdownEmail(props: {
  markdown: string;
  preview?: string;
  disabledSignature?: boolean;
}) {
  let processedMarkdown = props.markdown;

  if (!props.disabledSignature) {
    processedMarkdown += `

Best,\n
${SiteConfig.team.name} from ${SiteConfig.title}
    `;
  }

  // Normalize markdown by removing leading/trailing spaces from each line
  processedMarkdown = processedMarkdown
    .split("\n")
    .map((line) => line.trim())
    .join("\n");

  return (
    <EmailLayout disableTailwind>
      <Preview>{props.preview ?? "You receive a markdown email."}</Preview>
      <Markdown
        markdownCustomStyles={{
          p: {
            fontSize: "1.125rem",
            lineHeight: "1.5rem",
          },
          li: {
            fontSize: "1.125rem",
            lineHeight: "1.5rem",
          },
          link: {
            color: "#6366f1",
          },
        }}
      >
        {processedMarkdown}
      </Markdown>
    </EmailLayout>
  );
}
