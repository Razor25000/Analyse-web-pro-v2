import { redirect } from "next/navigation";

// Redirection automatique vers /dashboard/audits
export default function DashboardPage() {
  redirect("/dashboard/audits");
}
