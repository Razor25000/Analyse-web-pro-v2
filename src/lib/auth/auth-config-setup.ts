import type { User } from "better-auth";
import { nanoid } from "nanoid";
import { createOrganizationQuery } from "../../query/org/org-create.query";
import { env } from "../env";
import { generateSlug, getNameFromEmail } from "../format/id";
import { resend } from "../mail/resend";
import { prisma } from "../prisma";

export const setupResendCustomer = async (user: User) => {
  if (!user.email) {
    return;
  }

  if (!env.RESEND_AUDIENCE_ID) {
    return;
  }

  const contact = await resend.contacts.create({
    audienceId: env.RESEND_AUDIENCE_ID,
    email: user.email,
    firstName: user.name || "",
    unsubscribed: false,
  });

  if (!contact.data) return;

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      resendContactId: contact.data.id,
    },
  });

  return contact.data.id;
};

export const setupDefaultOrganizationsOrInviteUser = async (user: User) => {
  if (!user.email || !user.id) {
    return;
  }

  const name = user.name || getNameFromEmail(user.email);
  const orgSlug = generateSlug(name);
  await createOrganizationQuery({
    slug: orgSlug,
    name: `${name}'s organization`,
    email: user.email,
    logo: user.image,
    id: nanoid(),
    createdAt: new Date(),
    members: {
      create: {
        userId: user.id,
        role: "owner",
        id: nanoid(),
        createdAt: new Date(),
      },
    },
  });
};
