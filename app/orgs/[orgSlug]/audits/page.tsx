import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Upload, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface AuditPageProps {
  params: {
    orgSlug: string;
  };
}

// Composant pour les stats (sera dynamique plus tard)
function AuditStats() {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Audits</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12</div>
          <p className="text-xs text-muted-foreground">+2 ce mois</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Score Moyen</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">67</div>
          <p className="text-xs text-muted-foreground">+5 points</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">En Cours</CardTitle>
          <Upload className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">3</div>
          <p className="text-xs text-muted-foreground">Estimation: 5 min</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant pour la liste des audits récents
function RecentAudits() {
  // Données simulées pour l'instant
  const audits = [
    {
      id: '1',
      url: 'https://example.com',
      status: 'Terminé',
      score: 85,
      createdAt: '2024-01-15',
    },
    {
      id: '2', 
      url: 'https://test-site.fr',
      status: 'En cours',
      score: null,
      createdAt: '2024-01-15',
    },
    {
      id: '3',
      url: 'https://demo-website.com',
      status: 'Terminé',
      score: 72,
      createdAt: '2024-01-14',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audits Récents</CardTitle>
        <CardDescription>Vos derniers audits de sites web</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {audits.map((audit) => (
            <div key={audit.id} className="flex items-center justify-between border-b pb-4">
              <div className="space-y-1">
                <p className="font-medium">{audit.url}</p>
                <p className="text-sm text-muted-foreground">{audit.createdAt}</p>
              </div>
              <div className="flex items-center space-x-2">
                {audit.score && (
                  <Badge variant={audit.score >= 80 ? 'default' : audit.score >= 60 ? 'secondary' : 'destructive'}>
                    {audit.score}/100
                  </Badge>
                )}
                <Badge variant={audit.status === 'Terminé' ? 'default' : 'secondary'}>
                  {audit.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuditsPage({ params }: AuditPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audits de Sites</h1>
          <p className="text-muted-foreground">
            Analysez et optimisez vos sites web
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button asChild>
            <Link href={`/orgs/${params.orgSlug}/audits/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel Audit
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/audits/batch`}>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Suspense fallback={<div>Chargement des statistiques...</div>}>
        <AuditStats />
      </Suspense>

      {/* Audits récents */}
      <Suspense fallback={<div>Chargement des audits...</div>}>
        <RecentAudits />
      </Suspense>
    </div>
  );
}