import { Suspense } from "react";
import { NewAuditClient } from "@/components/nowts/new-audit-client";
import { Card, CardContent } from "@/components/ui/card";

// Composant de chargement pour Suspense
function NewAuditSkeleton() {
  return (
    <div className="from-background via-background to-muted/20 min-h-screen bg-gradient-to-br">
      <section className="relative py-12 lg:py-16">
        <div className="from-primary/5 to-accent/5 absolute inset-0 bg-gradient-to-br via-transparent" />
        <div className="dot-pattern absolute inset-0 opacity-30" />

        <div className="relative mx-auto max-w-6xl px-4">
          <div className="mb-8 flex items-center space-x-4">
            <div className="bg-muted h-8 w-8 animate-pulse rounded"></div>
          </div>

          <div className="mx-auto mb-12 max-w-4xl text-center">
            <div className="bg-muted mb-4 h-12 animate-pulse rounded"></div>
            <div className="bg-muted mx-auto mb-8 h-6 max-w-2xl animate-pulse rounded"></div>

            <div className="flex items-center justify-center space-x-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div className="bg-muted h-8 w-8 animate-pulse rounded-full"></div>
                  <div className="bg-muted h-4 w-16 animate-pulse rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="animate-pulse space-y-6">
                  <div className="bg-muted h-6 w-48 rounded"></div>
                  <div className="bg-muted h-4 w-64 rounded"></div>

                  <div className="space-y-4">
                    <div className="bg-muted h-14 rounded"></div>
                    <div className="bg-muted h-14 rounded"></div>
                  </div>

                  <div className="flex space-x-3">
                    <div className="bg-muted h-12 flex-1 rounded"></div>
                    <div className="bg-muted h-12 w-24 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-background/80 border-0 shadow-xl backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-2 text-center">
                  <div className="bg-muted mx-auto h-8 w-16 rounded"></div>
                  <div className="bg-muted mx-auto h-4 w-24 rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewAuditPage() {
  return (
    <Suspense fallback={<NewAuditSkeleton />}>
      <NewAuditClient />
    </Suspense>
  );
}
