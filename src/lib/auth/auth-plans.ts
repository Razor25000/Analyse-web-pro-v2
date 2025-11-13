import {
  Clock,
  FolderArchive,
  HardDrive,
  HeadphonesIcon,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import type { AuthPlan } from "./auth-type";

const DEFAULT_LIMIT = {
  projects: 5,
  storage: 10,
  members: 3,
};

export type PlanLimit = typeof DEFAULT_LIMIT;

export type AppAuthPlan = AuthPlan & {
  description: string;
  isPopular?: boolean;
  price: number;
  yearlyPrice?: number;
  currency: string;
  isHidden?: boolean;
  limits: PlanLimit;
};

export const AUTH_PLANS: AppAuthPlan[] = [
  {
    name: "free",
    description:
      "Perfect for individuals and small projects with essential features",
    limits: DEFAULT_LIMIT,
    price: 0,
    currency: "EUR",
    yearlyPrice: 0,
  },
  {
    name: "starter",
    isPopular: false,
    description: "Perfect for growing businesses with enhanced features",
    priceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? "",
    annualDiscountPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID ?? "",
    limits: {
      projects: 10,
      storage: 25,
      members: 5,
    },
    freeTrial: {
      days: 14,
    },
    price: 29,
    yearlyPrice: 290,
    currency: "EUR",
  },
  {
    name: "pro",
    isPopular: true,
    description: "Ideal for growing teams with advanced collaboration needs",
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
    annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "",
    limits: {
      projects: 20,
      storage: 50,
      members: 10,
    },
    freeTrial: {
      days: 14,
    },
    price: 49,
    yearlyPrice: 470,
    currency: "EUR",
  },
  {
    name: "premium",
    isPopular: false,
    description:
      "Enterprise-grade solution for large teams with complex requirements",
    priceId: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID ?? "",
    annualDiscountPriceId: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID ?? "",
    limits: {
      projects: 100,
      storage: 1000,
      members: 100,
    },
    freeTrial: {
      days: 14,
    },
    price: 100,
    yearlyPrice: 960,
    currency: "EUR",
  },
];

// Limits transformation object
export const LIMITS_CONFIG = {
  projects: {
    icon: FolderArchive,
    getLabel: (value: number) =>
      `${value} ${value === 1 ? "Project" : "Projects"}`,
    description: "Create and manage projects",
  },
  storage: {
    icon: HardDrive,
    getLabel: (value: number) => `${value} GB Storage`,
    description: "Cloud storage for your files",
  },
  members: {
    icon: Users,
    getLabel: (value: number) =>
      `${value} Team ${value === 1 ? "Member" : "Members"}`,
    description: "Invite team members to collaborate",
  },
};

// Additional features by plan
export const ADDITIONAL_FEATURES = {
  free: [
    {
      icon: Shield,
      label: "Basic Security",
      description: "Standard protection for your data",
    },
  ],
  pro: [
    {
      icon: Zap,
      label: "Priority Support",
      description: "Get help when you need it most",
    },
    {
      icon: HeadphonesIcon,
      label: "24/7 Customer Service",
      description: "Round-the-clock assistance",
    },
    {
      icon: Clock,
      label: "Advanced Analytics",
      description: "Detailed insights and reporting",
    },
  ],
  premium: [
    {
      icon: Zap,
      label: "Priority Support",
      description: "Get help when you need it most",
    },
    {
      icon: HeadphonesIcon,
      label: "24/7 Customer Service",
      description: "Round-the-clock assistance",
    },
    {
      icon: Clock,
      label: "Advanced Analytics",
      description: "Detailed insights and reporting",
    },
  ],
};

export const getPlanLimits = (plan = "free"): PlanLimit => {
  const planLimits = AUTH_PLANS.find((p) => p.name === plan)?.limits;

  return planLimits ?? DEFAULT_LIMIT;
};
