import { Suspense } from "react";
import { AuditListClient } from "@/components/nowts/audit-list-client";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

// Composant de chargement pour Suspense
function AuditListSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="bg-muted mb-2 h-8 w-48 rounded"></div>
          <div className="bg-muted h-4 w-64 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="bg-muted h-9 w-32 rounded"></div>
          <div className="bg-muted h-9 w-40 rounded"></div>
        </div>
      </div>

      <div className="bg-muted rounded-lg h-16"></div>

      <div className="grid gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-muted rounded-lg h-20"></div>
        ))}
      </div>
    </div>
  );
}

export default function AllAuditsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<AuditListSkeleton />}>
        <AuditListClient />
      </Suspense>
    </div>
  );
}