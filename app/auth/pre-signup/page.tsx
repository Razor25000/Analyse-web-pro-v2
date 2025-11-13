import { Loader } from "@/components/nowts/loader";
import { Typography } from "@/components/nowts/typography";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteConfig } from "@/site-config";
import Link from "next/link";
import { Suspense } from "react";
import { PreSignUpCredentialsForm } from "./pre-signup-credentials-form";

export default async function AuthPreSignUpPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  return (
    <Card className="mx-auto w-full max-w-md lg:max-w-lg lg:p-6">
      <CardHeader className="flex flex-col items-center justify-center gap-1">
        <Avatar className="mb-4 rounded-sm">
          <AvatarImage src={SiteConfig.appIcon} alt="app logo" />
          <AvatarFallback>
            {SiteConfig.title.substring(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <CardTitle>Pré-inscription à {SiteConfig.title}</CardTitle>
        <CardDescription>
          Créez votre compte gratuit pour commencer vos audits web.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Loader />}>
          <PreSignUpCredentialsForm />
        </Suspense>

        <Typography variant="muted" className="mt-4 text-xs">
          Vous avez déjà un compte?{" "}
          <Typography variant="link" as={Link} href="/auth/signin">
            Connectez-vous
          </Typography>
        </Typography>
      </CardContent>
    </Card>
  );
}
