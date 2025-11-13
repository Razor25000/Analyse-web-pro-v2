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
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Mail,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type NotificationSettings = {
  emailAuditComplete: boolean;
  emailAuditStarted: boolean;
  emailQuotaWarning: boolean;
  emailQuotaExceeded: boolean;
  emailBilling: boolean;
  emailMarketing: boolean;
  browserNotifications: boolean;
  pushNotifications: boolean;
};

export function NotificationsSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailAuditComplete: true,
    emailAuditStarted: false,
    emailQuotaWarning: true,
    emailQuotaExceeded: true,
    emailBilling: true,
    emailMarketing: false,
    browserNotifications: true,
    pushNotifications: false,
  });

  const [saving, setSaving] = useState(false);

  const handleToggle = (key: keyof NotificationSettings) => {
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
      {/* Notifications par email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notifications par email
          </CardTitle>
          <CardDescription>
            Configurez les notifications que vous souhaitez recevoir par email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Audits */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-medium">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Audits
            </h3>
            <div className="ml-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="audit-complete" className="text-sm">
                  Audit terminé
                  <p className="text-muted-foreground text-xs">
                    Recevoir un email quand un audit est terminé
                  </p>
                </Label>
                <Switch
                  id="audit-complete"
                  checked={settings.emailAuditComplete}
                  onCheckedChange={() => handleToggle("emailAuditComplete")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="audit-started" className="text-sm">
                  Audit démarré
                  <p className="text-muted-foreground text-xs">
                    Recevoir un email quand un audit démarre
                  </p>
                </Label>
                <Switch
                  id="audit-started"
                  checked={settings.emailAuditStarted}
                  onCheckedChange={() => handleToggle("emailAuditStarted")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quotas */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Quotas
            </h3>
            <div className="ml-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="quota-warning" className="text-sm">
                  Avertissement quota
                  <p className="text-muted-foreground text-xs">
                    Recevoir un email à 80% du quota mensuel
                  </p>
                </Label>
                <Switch
                  id="quota-warning"
                  checked={settings.emailQuotaWarning}
                  onCheckedChange={() => handleToggle("emailQuotaWarning")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="quota-exceeded" className="text-sm">
                  Quota dépassé
                  <p className="text-muted-foreground text-xs">
                    Recevoir un email quand le quota est atteint
                  </p>
                </Label>
                <Switch
                  id="quota-exceeded"
                  checked={settings.emailQuotaExceeded}
                  onCheckedChange={() => handleToggle("emailQuotaExceeded")}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Facturation */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 font-medium">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              Facturation
            </h3>
            <div className="ml-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="billing" className="text-sm">
                  Emails de facturation
                  <p className="text-muted-foreground text-xs">
                    Factures, échecs de paiement, etc.
                  </p>
                </Label>
                <Switch
                  id="billing"
                  checked={settings.emailBilling}
                  onCheckedChange={() => handleToggle("emailBilling")}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="marketing" className="text-sm">
                  Emails marketing
                  <p className="text-muted-foreground text-xs">
                    Nouvelles fonctionnalités, conseils, etc.
                  </p>
                </Label>
                <Switch
                  id="marketing"
                  checked={settings.emailMarketing}
                  onCheckedChange={() => handleToggle("emailMarketing")}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications push */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications navigateur
          </CardTitle>
          <CardDescription>
            Configurez les notifications dans votre navigateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="browser-notifications" className="text-sm">
              Notifications navigateur
              <p className="text-muted-foreground text-xs">
                Recevoir des notifications dans votre navigateur
              </p>
            </Label>
            <Switch
              id="browser-notifications"
              checked={settings.browserNotifications}
              onCheckedChange={() => handleToggle("browserNotifications")}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications" className="text-sm">
              Notifications push mobiles
              <p className="text-muted-foreground text-xs">
                Recevoir des notifications sur votre téléphone
              </p>
            </Label>
            <Switch
              id="push-notifications"
              checked={settings.pushNotifications}
              onCheckedChange={() => handleToggle("pushNotifications")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Gestion avancée */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion avancée</CardTitle>
          <CardDescription>
            Options de configuration avancées pour les notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              <div>
                <h3 className="font-medium">Préférences détaillées</h3>
                <p className="text-muted-foreground text-sm">
                  Configurez finement vos préférences email
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/account/email">
                <ExternalLink className="mr-2 h-4 w-4" />
                Gérer
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Boutons d'action */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Sauvegarde..." : "Sauvegarder les préférences"}
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
