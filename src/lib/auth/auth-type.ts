import type { stripe as stripePlugin } from "@better-auth/stripe";
import type { auth } from "../auth";

// Note: Organizations are not implemented in current B2C model
// This type is kept for future compatibility
export type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

type StripePluginSubscriptions = Parameters<
  typeof stripePlugin
>[0]["subscription"];

export type EnabledAuthPlan =
  NonNullable<StripePluginSubscriptions> extends { enabled: infer E }
    ? E extends true
      ? NonNullable<StripePluginSubscriptions>
      : never
    : never;

type Plans = EnabledAuthPlan["plans"];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlanArray = Extract<Plans, any[]>;

export type AuthPlan = PlanArray extends (infer P)[] ? P : never;
