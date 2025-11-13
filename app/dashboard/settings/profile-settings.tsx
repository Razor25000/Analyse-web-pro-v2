import { Suspense } from "react";
import { getRequiredUser } from "@/lib/auth/auth-user";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditProfileCardForm } from "../../(logged-in)/(account-layout)/account/(settings)/edit-profile-form";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Key, Trash2 } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export async function ProfileSettings() {
  const user = await getRequiredUser();

  return (
    <div className="space-y-6">
      {/* Informations principales */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du profil</CardTitle>
          <CardDescription>
            Modifiez vos informations personnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditProfileCardForm defaultValues={user} />
        </CardContent>
      </Card>

      {/* Actions supplémentaires */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion du compte</CardTitle>
          <CardDescription>
            Gérez votre email, mot de passe et autres paramètres de sécurité
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {/* Changer l'email */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-blue-500" />
                <div>
                  <h3 className="font-medium">Email</h3>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/account/change-email">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </Button>
            </div>

            {/* Changer le mot de passe */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-green-500" />
                <div>
                  <h3 className="font-medium">Mot de passe</h3>
                  <p className="text-muted-foreground text-sm">
                    Dernière modification récente
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/account/change-password">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Modifier
                </Link>
              </Button>
            </div>

            <Separator className="my-4" />

            {/* Zone dangereuse */}
            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 p-4">
              <div className="flex items-center gap-3">
                <Trash2 className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="font-medium text-red-800">
                    Supprimer le compte
                  </h3>
                  <p className="text-sm text-red-600">
                    Action définitive et irréversible
                  </p>
                </div>
              </div>
              <Button asChild variant="destructive" size="sm">
                <Link href="/account/danger">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Gérer
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
