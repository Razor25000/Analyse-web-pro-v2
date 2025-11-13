import { Suspense } from "react";
import { AuditDashboardClient } from "@/components/nowts/audit-dashboard-client";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

// Composant de chargement pour Suspense
function AuditDashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="bg-muted mb-2 h-8 w-32 rounded"></div>
          <div className="bg-muted h-4 w-48 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="bg-muted h-9 w-24 rounded"></div>
          <div className="bg-muted h-9 w-32 rounded"></div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="bg-muted mb-4 h-16 rounded"></div>
              <div className="space-y-2">
                <div className="bg-muted h-6 w-16 rounded"></div>
                <div className="bg-muted h-4 w-24 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="bg-muted h-64 rounded"></div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-muted h-16 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<AuditDashboardSkeleton />}>
        <AuditDashboardClient />
      </Suspense>
    </div>
  );
}
