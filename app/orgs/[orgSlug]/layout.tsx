import { RefreshPageOrganization } from "@/components/utils/refresh-organization";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { orgMetadata } from "@/lib/metadata";
import { getCurrentOrg } from "@/lib/organizations/get-org";
import { prisma } from "@/lib/prisma";
import type { LayoutParams, PageParams } from "@/types/next";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { OrgList } from "./(navigation)/_navigation/org-list";
import { InjectCurrentOrgStore } from "./use-current-org";

export async function generateMetadata(
  props: PageParams<{ orgSlug: string }>,
): Promise<Metadata> {
  const params = await props.params;
  return orgMetadata(params.orgSlug);
}

export default async function RouteLayout(
  props: LayoutParams<{ orgSlug: string }>,
) {
  const params = await props.params;

  const org = await getCurrentOrg();

  if (!org) {
    return <OrgList />;
  }

  // The user try to go to another organization, we must sync with the URL
  if (org.slug !== params.orgSlug) {
    const isId = await prisma.organization.findUnique({
      where: {
        id: params.orgSlug,
      },
      select: {
        slug: true,
        id: true,
      },
    });

    await auth.api.setActiveOrganization({
      headers: await headers(),
      body: {
        organizationSlug: isId ? undefined : params.orgSlug,
        organizationId: isId ? params.orgSlug : undefined,
      },
    });

    // Force to always have the slug inside the URL
    logger.warn("Full reload because unsync state");
    return <RefreshPageOrganization />;
  }

  return (
    <InjectCurrentOrgStore
      org={{
        id: org.id,
        slug: org.slug,
        name: org.name,
        image: org.logo ?? null,
        subscription: org.subscription,
      }}
    >
      {props.children}
    </InjectCurrentOrgStore>
  );
}
