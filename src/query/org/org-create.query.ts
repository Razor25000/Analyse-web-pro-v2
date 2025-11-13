import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const createOrganizationQuery = async (
  params: Prisma.UserCreateInput,
) => {
  // In B2C model, creating an "organization" means creating/updating a user
  // with organization-specific metadata
  const user = await prisma.user.create({
    data: {
      ...params,
      monthlyQuota: 10, // Default quota
      quotaUsed: 0,
      quotaResetDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    },
  });

  return user;
};
