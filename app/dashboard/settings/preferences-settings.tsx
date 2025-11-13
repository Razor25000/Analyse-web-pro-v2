"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Monitor,
  Moon,
  Sun,
  Globe,
  Clock,
  BarChart3,
  FileText,
  Download,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

type PreferencesSettings = {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  dateFormat: string;
  showAnalytics: boolean;
  autoSaveReports: boolean;
  defaultDownloadFormat: string;
  showBetaFeatures: boolean;
  compactView: boolean;
};

export function PreferencesSettings() {
  const [settings, setSettings] = useState<PreferencesSettings>({
    theme: "system",
    language: "fr",
    timezone: "Europe/Paris",
    dateFormat: "DD/MM/YYYY",
    showAnalytics: true,
    autoSaveReports: true,
    defaultDownloadFormat: "pdf",
    showBetaFeatures: false,
    compactView: false,
  });

  const [saving, setSaving] = useState(false);

  const handleSelectChange = (
    key: keyof PreferencesSettings,
    value: string,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggle = (key: keyof PreferencesSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Simuler une sauvegarde
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Préférences sauvegardées avec succès");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Apparence */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Apparence
          </CardTitle>
          <CardDescription>
            Personnalisez l'apparence de l'interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Thème</Label>
            <Select
              value={settings.theme}
              onValueChange={(value) => handleSelectChange("theme", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    Clair
                  </div>
                </SelectItem>
                <SelectItem value="dark">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Sombre
                  </div>
                </SelectItem>
                <SelectItem value="system">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    Automatique (système)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="compact-view" className="text-sm">
              Vue compacte
              <p className="text-muted-foreground text-xs">
                Afficher plus d'informations dans moins d'espace
              </p>
            </Label>
            <Switch
              id="compact-view"
              checked={settings.compactView}
              onCheckedChange={() => handleToggle("compactView")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Localisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Localisation
          </CardTitle>
          <CardDescription>
            Configurez la langue, le fuseau horaire et les formats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Langue</Label>
            <Select
              value={settings.language}
              onValueChange={(value) => handleSelectChange("language", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Fuseau horaire
            </Label>
            <Select
              value={settings.timezone}
              onValueChange={(value) => handleSelectChange("timezone", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Paris">Paris (UTC+1)</SelectItem>
                <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                <SelectItem value="America/New_York">
                  New York (UTC-5)
                </SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (UTC+9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Format de date</Label>
            <Select
              value={settings.dateFormat}
              onValueChange={(value) => handleSelectChange("dateFormat", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">
                  DD/MM/YYYY (31/12/2024)
                </SelectItem>
                <SelectItem value="MM/DD/YYYY">
                  MM/DD/YYYY (12/31/2024)
                </SelectItem>
                <SelectItem value="YYYY-MM-DD">
                  YYYY-MM-DD (2024-12-31)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rapports et données */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rapports et données
          </CardTitle>
          <CardDescription>
            Configurez la génération et le stockage des rapports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="show-analytics" className="text-sm">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Afficher les analytics
              </div>
              <p className="text-muted-foreground text-xs">
                Afficher les graphiques et statistiques détaillées
              </p>
            </Label>
            <Switch
              id="show-analytics"
              checked={settings.showAnalytics}
              onCheckedChange={() => handleToggle("showAnalytics")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-save" className="text-sm">
              Sauvegarde automatique
              <p className="text-muted-foreground text-xs">
                Sauvegarder automatiquement les rapports
              </p>
            </Label>
            <Switch
              id="auto-save"
              checked={settings.autoSaveReports}
              onCheckedChange={() => handleToggle("autoSaveReports")}
            />
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Format de téléchargement par défaut
            </Label>
            <Select
              value={settings.defaultDownloadFormat}
              onValueChange={(value) =>
                handleSelectChange("defaultDownloadFormat", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fonctionnalités avancées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Fonctionnalités avancées
          </CardTitle>
          <CardDescription>
            Activez les fonctionnalités expérimentales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="beta-features" className="text-sm">
              Fonctionnalités beta
              <p className="text-muted-foreground text-xs">
                Accéder aux nouvelles fonctionnalités en cours de développement
              </p>
            </Label>
            <Switch
              id="beta-features"
              checked={settings.showBetaFeatures}
              onCheckedChange={() => handleToggle("showBetaFeatures")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder les préférences"}
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
