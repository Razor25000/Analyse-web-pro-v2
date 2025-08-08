import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

export const createOrganizationQuery = async (
  params: Prisma.OrganizationUncheckedCreateInput,
) => {
  // const customer = await stripe.customers.create({
  //   email: params.email,
  //   name: params.name,
  // });

  const organization = await prisma.organization.create({
    data: {
      ...params,
      // stripeCustomerId: customer.id,
    },
  });

  return organization;
};
