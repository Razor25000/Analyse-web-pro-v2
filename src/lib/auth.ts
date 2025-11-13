import { stripe as stripePlugin } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { sendEmail } from "@/lib/mail/send-email";
import { SiteConfig } from "@/site-config";
import MarkdownEmail from "@email/markdown.email";
import type Stripe from "stripe";
import {
  setupDefaultOrganizationsOrInviteUser,
  setupResendCustomer,
} from "./auth/auth-config-setup";
import { AUTH_PLANS } from "./auth/auth-plans";
import { env } from "./env";
import { logger } from "./logger";
import { prisma } from "./prisma";
import { getServerUrl } from "./server-url";
import { stripe } from "./stripe";

type SocialProvidersType = Parameters<typeof betterAuth>[0]["socialProviders"];

export const SocialProviders: SocialProvidersType = {};

if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
  SocialProviders.github = {
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  };
}

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  SocialProviders.google = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  };
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL: getServerUrl(),
  trustedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await setupDefaultOrganizationsOrInviteUser(user);
          await setupResendCustomer(user);
        },
      },
    },
  },
  advanced: {
    cookiePrefix: SiteConfig.appId,
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: MarkdownEmail({
          preview: `Reset your password for ${SiteConfig.title}`,
          markdown: `
          Hello,

          You requested to reset your password.

          [Click here to reset your password](${url})
          `,
        }),
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ newEmail, url }) => {
        await sendEmail({
          to: newEmail,
          subject: "Change email address",
          html: MarkdownEmail({
            preview: `Change your email address for ${SiteConfig.title}`,
            markdown: `
            Hello,

            You requested to change your email address.

            [Click here to verify your new email address](${url})
            `,
          }),
        });
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, token }) => {
        const url = `${getServerUrl()}/auth/confirm-delete?token=${token}&callbackUrl=/auth/goodbye`;
        await sendEmail({
          to: user.email,
          subject: "Delete your account",
          html: MarkdownEmail({
            preview: `Delete your account from ${SiteConfig.title}`,
            markdown: `
            Hello,

            You requested to delete your account.

            [Click here to confirm account deletion](${url})
            `,
          }),
        });
      },
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        html: MarkdownEmail({
          preview: `Verify your email for ${SiteConfig.title}`,
          markdown: `
          Hello,

          Welcome to ${SiteConfig.title}! Please verify your email address.

          [Click here to verify your email](${url})
          `,
        }),
      });
    },
  },
  socialProviders: SocialProviders,
  plugins: [
    stripePlugin({
      stripeClient: stripe,
      stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET ?? "",
      createCustomerOnSignUp: true,
      subscription: {
        onSubscriptionUpdate: async ({ event, subscription }) => {
          const object = event.data.object as Stripe.Subscription;
          const priceId = object.items.data[0].price.id;

          const matchingPlan = AUTH_PLANS.find(
            (p) => p.annualDiscountPriceId === priceId || p.priceId === priceId,
          );

          if (!matchingPlan) {
            logger.error("No matching plan found", { event, subscription });
            return;
          }

          if (subscription.plan === matchingPlan.name) {
            return;
          }

          // Sync the subscription plan with the matching plan
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              plan: matchingPlan.name,
            },
          });
        },
        // B2C: l'utilisateur a accès à ses propres ressources uniquement
        authorizeReference: async ({ user }) => {
          return true; // Dans B2C, l'utilisateur gère ses propres abonnements
        },
        enabled: true,
        plans: AUTH_PLANS,
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Sign in to your account",
          html: MarkdownEmail({
            preview: `Magic link to login ${SiteConfig.title}`,
            markdown: `
            Hello,

            You requested a magic link to sign in to your account.

            [Click here to sign in](${url})
            `,
          }),
        });
      },
    }),
    // Warning: always last plugin
    nextCookies(),
  ],
});
