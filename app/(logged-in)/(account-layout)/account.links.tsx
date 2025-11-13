import type { NavigationGroup } from "@/features/navigation/navigation.type";
import { AlertCircle, CreditCard, Key, Mail, User2 } from "lucide-react";

export const getAccountNavigation = (): NavigationGroup[] => {
  return ACCOUNT_LINKS;
};

const ACCOUNT_LINKS: NavigationGroup[] = [
  {
    title: "Your profile",
    links: [
      {
        href: "/account",
        Icon: User2,
        label: "Profile",
      },
      {
        href: "/account/change-email",
        Icon: Mail,
        label: "Change Email",
      },
      {
        href: "/account/change-password",
        Icon: Key,
        label: "Change Password",
      },
    ],
  },
  {
    title: "Billing & Subscription",
    links: [
      {
        href: "/dashboard/billing",
        Icon: CreditCard,
        label: "Billing",
      },
      {
        href: "/account/email",
        Icon: Mail,
        label: "Email Settings",
      },
    ],
  },
  {
    title: "Account Management",
    links: [
      {
        href: "/account/danger",
        Icon: AlertCircle,
        label: "Delete Account",
      },
    ],
  },
];
