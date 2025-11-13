"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Calendar,
} from "lucide-react";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";

// Types pour la configuration d'export
export type ExportConfig = {
  format: "pdf" | "html" | "json" | "csv";
  filters: {
    status?: string[];
    dateRange?: {
      from?: string;
      to?: string;
    };
    auditType?: string[];
    minScore?: number;
  };
  includeMetadata: boolean;
  includeScreenshots: boolean;
};

export type ExportStatus = {
  phase: "preparing" | "processing" | "packaging" | "completed" | "error";
  progress: number;
  message: string;
  totalAudits?: number;
  processedAudits?: number;
  currentFile?: string;
  error?: string;
};

export type ExportResult = {
  success: boolean;
  downloadUrl?: string;
  jobId?: string;
  config?: ExportConfig;
  status?: ExportStatus;
  error?: string;
};

const exportConfigSchema = z.object({
  format: z.enum(["pdf", "html", "json", "csv"]),
  filters: z.object({
    status: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().optional(),
      to: z.string().optional(),
    }).optional(),
    auditType: z.array(z.string()).optional(),
    minScore: z.number().min(0).max(100).optional(),
  }).optional(),
  includeMetadata: z.boolean().default(true),
  includeScreenshots: z.boolean().default(false),
});

type ExportAuditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onExport: (config: ExportConfig) => Promise<ExportResult>;
  currentJob?: {
    id: string;
    status: any;
    config: any;
  } | null;
};

export function ExportAuditModal({
  isOpen,
  onClose,
  onExport,
  currentJob,
}: ExportAuditModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const form = useForm<ExportConfig>({
    resolver: zodResolver(exportConfigSchema),
    defaultValues: {
      format: "pdf",
      filters: {
        status: [],
        auditType: [],
        minScore: 0,
      },
      includeMetadata: true,
      includeScreenshots: false,
    },
  });

  const formatOptions = [
    { value: "pdf", label: "PDF", description: "Format optimisé pour l'impression" },
    { value: "html", label: "HTML", description: "Format web interactif" },
    { value: "json", label: "JSON", description: "Données structurées" },
    { value: "csv", label: "CSV", description: "Format tableur" },
  ];

  // Valeurs par défaut pour les options de statut
  const defaultStatuses = ["completed", "processing", "failed", "pending"];
  const statusOptions = defaultStatuses.map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
  }));

  const handleExport = async (config: ExportConfig) => {
    setIsExporting(true);
    setExportStatus(null);
    setExportResult(null);

    try {
      console.log("🚀 Démarrage de l'export:", config);
      const result = await onExport(config);

      if (result && result.success) {
        setExportResult(result);
        setExportStatus({
          phase: "completed",
          progress: 100,
          message: "Export terminé avec succès",
        });

        // Téléchargement automatique si URL disponible
        if (result.downloadUrl) {
          setTimeout(() => {
            window.open(result.downloadUrl, '_blank');
          }, 1000);
        }
      } else {
        setExportStatus({
          phase: "error",
          progress: 0,
          message: result?.error || "Erreur lors de l'export",
          error: result?.error,
        });
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'export:", error);
      setExportStatus({
        phase: "error",
        progress: 0,
        message: "Erreur technique lors de l'export",
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getPhaseIcon = (phase: ExportStatus["phase"]) => {
    switch (phase) {
      case "preparing":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <Download className="h-4 w-4 animate-bounce" />;
      case "packaging":
        return <FileText className="h-4 w-4 animate-pulse" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "error":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPhaseColor = (phase: ExportStatus["phase"]) => {
    switch (phase) {
      case "preparing":
        return "text-blue-600";
      case "processing":
        return "text-blue-600";
      case "packaging":
        return "text-orange-600";
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const resetModal = () => {
    form.reset();
    setExportStatus(null);
    setExportResult(null);
    setIsExporting(false);
  };

  const handleClose = () => {
    if (!isExporting) {
      resetModal();
      setIsDialogOpen(false);
    }
  };

  // Utiliser le dialog manager
  const openDialog = () => {
    dialogManager.custom({
      title: "Exporter les audits",
      description: "Configurez l'export de vos audits au format souhaité",
      children: (
        <div className="space-y-6">
          <Form form={form} onSubmit={form.handleSubmit(handleExport)}>
            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format d'export</FormLabel>
                  <Select
                    value={field.value?.toString() || ''}
                    onValueChange={field.onChange}
                    disabled={isExporting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez un format" />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choisissez le format de sortie pour vos audits
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Filtres</h3>

              <FormField
                control={form.control}
                name="filters.status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statuts à inclure</FormLabel>
                    <Select
                      value={field.value?.[0] || ''}
                      onValueChange={(value) => field.onChange(value ? [value] : [])}
                      disabled={isExporting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Laissez vide pour inclure tous les statuts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filters.minScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score minimum</FormLabel>
                    <Select
                      value={field.value?.toString() || '0'}
                      onValueChange={(value) => field.onChange(value ? parseInt(value, 10) : 0)}
                      disabled={isExporting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Score minimum" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Tous les scores</SelectItem>
                        <SelectItem value="50">50+ points</SelectItem>
                        <SelectItem value="70">70+ points</SelectItem>
                        <SelectItem value="85">85+ points</SelectItem>
                        <SelectItem value="95">95+ points</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Filtrez les audits par score minimum
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Options</h3>

              <FormField
                control={form.control}
                name="includeMetadata"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isExporting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Inclure les métadonnées</FormLabel>
                      <FormDescription>
                        Ajoute les informations détaillées de configuration
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includeScreenshots"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isExporting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Inclure les captures d'écran</FormLabel>
                      <FormDescription>
                        Ajoute les captures d'écran des audits (augmente la taille)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {exportStatus && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Progression</h3>
                <div className="flex items-center space-x-3">
                  <div className={getPhaseColor(exportStatus.phase)}>
                    {getPhaseIcon(exportStatus.phase)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">
                        {exportStatus.phase}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {exportStatus.progress}%
                      </span>
                    </div>
                    <Progress value={exportStatus.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {exportStatus.message}
                      {exportStatus.processedAudits && exportStatus.totalAudits && (
                        <span className="block">
                          {exportStatus.processedAudits} / {exportStatus.totalAudits} audits traités
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isExporting}
                className="w-full sm:w-auto"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(handleExport)}
                disabled={isExporting}
                className="w-full sm:w-auto"
              >
                {isExporting ? (
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4 animate-bounce" />
                    Exportation...
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    Exporter
                  </div>
                )}
              </Button>
            </DialogFooter>
          </Form>
        </div>
      ),
      action: {
        label: isExporting ? "Exportation en cours..." : "Exporter",
        onClick: async () => form.handleSubmit(handleExport)(),
        variant: "default",
      },
      cancel: {
        label: "Annuler",
        onClick: () => {
          handleClose();
          onClose();
        },
      },
      size: "lg",
      variant: "default",
      style: "default",
    });
    setIsDialogOpen(true);
  };

  // Gérer l'état local pour le dialogue
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Ouvrir le dialogue quand la prop isOpen change
  useEffect(() => {
    if (isOpen) {
      openDialog();
      setIsDialogOpen(true);
    }
  }, [isOpen]);

  // Fermer le dialogue quand la prop isOpen devient false
  useEffect(() => {
    if (isDialogOpen && !isOpen) {
      resetModal();
      setIsDialogOpen(false);
    }
  }, [isDialogOpen, isOpen]);

  return null; // Le dialogue est géré par le dialog manager
}