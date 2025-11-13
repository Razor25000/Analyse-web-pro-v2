"use client";

import { useAuditData } from "@/hooks/use-audit-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileText,
  BarChart3,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Zap,
  Clock,
  Search,
  Filter,
  Download,
  ArrowUpDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import Link from "next/link";

type SortOption = "createdAt" | "score" | "status" | "url";
type SortDirection = "asc" | "desc";

export function AuditListClient() {
  const {
    audits,
    stats,
    isLoading,
    error,
    lastFetch,
    refresh,
  } = useAuditData({});

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Fonction pour obtenir la couleur du status
  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (
      lowerStatus.includes("completed") ||
      lowerStatus.includes("succeeded") ||
      lowerStatus.includes("terminé")
    ) {
      return "bg-green-100 text-green-800";
    }
    if (
      lowerStatus.includes("processing") ||
      lowerStatus.includes("running") ||
      lowerStatus.includes("cours")
    ) {
      return "bg-blue-100 text-blue-800";
    }
    if (
      lowerStatus.includes("failed") ||
      lowerStatus.includes("error") ||
      lowerStatus.includes("erreur")
    ) {
      return "bg-red-100 text-red-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (
      lowerStatus.includes("completed") ||
      lowerStatus.includes("succeeded") ||
      lowerStatus.includes("terminé")
    ) {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (
      lowerStatus.includes("processing") ||
      lowerStatus.includes("running") ||
      lowerStatus.includes("cours")
    ) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (
      lowerStatus.includes("failed") ||
      lowerStatus.includes("error") ||
      lowerStatus.includes("erreur")
    ) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  // Fonction pour télécharger un audit
  const handleDownloadAudit = async (auditId: string) => {
    try {
      console.log(`📥 Téléchargement de l'audit ${auditId}`);
      window.open(`/api/audits/${auditId}/download`, '_blank');
    } catch (error) {
      console.error("❌ Erreur lors du téléchargement:", error);
    }
  };

  // Filtrer et trier les audits
  const filteredAndSortedAudits = useMemo(() => {
    let filtered = audits;

    // Filtrer par recherche
    if (searchTerm) {
      filtered = filtered.filter(
        (audit) =>
          audit.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
          audit.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrer par status
    if (statusFilter) {
      filtered = filtered.filter((audit) =>
        audit.status.toLowerCase().includes(statusFilter.toLowerCase())
      );
    }

    // Trier
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "score":
          aValue = a.score ?? -1;
          bValue = b.score ?? -1;
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "url":
          aValue = a.url.toLowerCase();
          bValue = b.url.toLowerCase();
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [audits, searchTerm, statusFilter, sortBy, sortDirection]);

  // Stats des filtres
  const uniqueStatuses = useMemo(() => {
    const statuses = [...new Set(audits.map(a => a.status.toLowerCase()))];
    return statuses;
  }, [audits]);

  const toggleSort = (field: SortOption) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("desc");
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Erreur de chargement
            </CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={refresh}
              variant="outline"
              className="border-red-300"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tous les Audits</h1>
          <p className="text-muted-foreground">
            {filteredAndSortedAudits.length} sur {audits.length} audits affichés • Dernière mise à jour{" "}
            {lastFetch ? formatDate(lastFetch.toISOString()) : "Jamais"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
          <Link href="/dashboard/audits/new">
            <Button>
              <Zap className="mr-2 h-4 w-4" />
              Nouvel Audit
            </Button>
          </Link>
        </div>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Recherche */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par URL ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtres */}
            <div className="flex items-center gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Tous les statuts</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tri */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Trier par :</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSort("createdAt")}
              className={`px-2 ${sortBy === "createdAt" ? "text-foreground" : ""}`}
            >
              Date
              {sortBy === "createdAt" && (
                <ArrowUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSort("score")}
              className={`px-2 ${sortBy === "score" ? "text-foreground" : ""}`}
            >
              Score
              {sortBy === "score" && (
                <ArrowUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSort("status")}
              className={`px-2 ${sortBy === "status" ? "text-foreground" : ""}`}
            >
              Statut
              {sortBy === "status" && (
                <ArrowUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSort("url")}
              className={`px-2 ${sortBy === "url" ? "text-foreground" : ""}`}
            >
              URL
              {sortBy === "url" && (
                <ArrowUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{audits.length}</h3>
              <p className="text-muted-foreground text-sm">Total Audits</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-green-50 p-3 text-green-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{stats.completed}</h3>
              <p className="text-muted-foreground text-sm">Terminés</p>
              <p className="text-xs text-green-600">
                {audits.length > 0
                  ? Math.round((stats.completed / audits.length) * 100)
                  : 0}
                % de réussite
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
                <RefreshCw className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{stats.processing}</h3>
              <p className="text-muted-foreground text-sm">En Traitement</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
                <Filter className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{filteredAndSortedAudits.length}</h3>
              <p className="text-muted-foreground text-sm">Filtrés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des audits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="text-primary h-5 w-5" />
            Liste Complète des Audits
          </CardTitle>
          <CardDescription>
            {filteredAndSortedAudits.length} audit{filteredAndSortedAudits.length > 1 ? "s" : ""} trouvé{filteredAndSortedAudits.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedAudits.length === 0 ? (
            <div className="text-muted-foreground py-16 text-center">
              <Filter className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">Aucun audit trouvé</p>
              <p className="text-sm">
                {searchTerm || statusFilter
                  ? "Essayez de modifier vos filtres"
                  : "Aucun audit n'a encore été créé"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                        URL
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                        Date
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedAudits.map((audit) => (
                      <tr
                        key={audit.id}
                        className="border-b hover:bg-accent/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(audit.status)}
                            <Badge
                              className={`text-xs ${getStatusColor(audit.status)}`}
                            >
                              {audit.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-xs truncate" title={audit.url}>
                            <a
                              href={audit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {audit.url}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-muted-foreground">
                            {audit.email}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {audit.score !== null ? (
                            <Badge variant="outline" className="text-xs">
                              {audit.score}/100
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-muted-foreground">
                            {formatDate(audit.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            {audit.htmlReport && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={async () => handleDownloadAudit(audit.id)}
                                title="Télécharger le rapport"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              asChild
                            >
                              <a
                                href={audit.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Visiter le site"
                              >
                                <ArrowUpDown className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}