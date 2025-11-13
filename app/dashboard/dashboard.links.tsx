import type { NavigationGroup } from "@/features/navigation/navigation.type";
import {
  BarChart3,
  CreditCard,
  FileSearch,
  Settings,
  Upload,
  Zap,
} from "lucide-react";

export const getDashboardNavigation = (): NavigationGroup[] => {
  return DASHBOARD_LINKS;
};

const DASHBOARD_LINKS: NavigationGroup[] = [
  {
    title: "Audits",
    links: [
      {
        href: "/dashboard/audits",
        Icon: FileSearch,
        label: "Mes Audits",
      },
      {
        href: "/dashboard/audits/new",
        Icon: Zap,
        label: "Nouvel Audit",
      },
      {
        href: "/dashboard/audits/batch",
        Icon: Upload,
        label: "Audit en Lot",
      },
    ],
  },
  {
    title: "Account",
    links: [
      {
        href: "/dashboard/billing",
        Icon: CreditCard,
        label: "Billing & Plans",
      },
      {
        href: "/dashboard/settings",
        Icon: Settings,
        label: "Paramètres",
      },
    ],
  },
];
