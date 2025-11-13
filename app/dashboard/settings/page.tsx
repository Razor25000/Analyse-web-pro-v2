import { Suspense } from "react";
import { SubscriptionManagement } from "@/components/nowts/subscription-management";
import { ProfileSettings } from "./profile-settings";
import { NotificationsSettings } from "./notifications-settings";
import { PreferencesSettings } from "./preferences-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, CreditCard, User, Bell } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Settings className="h-8 w-8" />
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-2">
          Gérez votre compte, votre abonnement et vos préférences
        </p>
      </div>

      <Tabs defaultValue="subscription" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Abonnement
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profil
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Préférences
          </TabsTrigger>
        </TabsList>

        {/* Onglet Abonnement */}
        <TabsContent value="subscription" className="space-y-6">
          <Suspense fallback={<div>Chargement...</div>}>
            <SubscriptionManagement />
          </Suspense>
        </TabsContent>

        {/* Onglet Profil */}
        <TabsContent value="profile" className="space-y-6">
          <Suspense fallback={<div>Chargement du profil...</div>}>
            <ProfileSettings />
          </Suspense>
        </TabsContent>

        {/* Onglet Notifications */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationsSettings />
        </TabsContent>

        {/* Onglet Préférences */}
        <TabsContent value="preferences" className="space-y-6">
          <PreferencesSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
