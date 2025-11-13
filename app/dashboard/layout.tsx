import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/auth-user";
import { SubscriptionGuard } from "@/components/nowts/subscription-guard";
import { DashboardNavigation } from "./dashboard-navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <SubscriptionGuard requiredPlan="free">
      <DashboardNavigation>{children}</DashboardNavigation>
    </SubscriptionGuard>
  );
}
