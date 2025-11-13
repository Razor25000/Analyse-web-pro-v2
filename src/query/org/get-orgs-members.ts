import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const getOrgsMembers = async (orgId: string) => {
  // In B2C model, get users who have created audits for this organization ID
  // Since there are no members, we return the user who created the organization
  const user = await prisma.user.findUnique({
    where: { id: orgId },
    select: {
      image: true,
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    return [];
  }

  // Return user as a member with owner role
  return [
    {
      user,
      id: orgId,
      role: "owner",
      userId: orgId,
    },
  ];
};

export type OrgMembers = Prisma.PromiseReturnType<typeof getOrgsMembers>;
