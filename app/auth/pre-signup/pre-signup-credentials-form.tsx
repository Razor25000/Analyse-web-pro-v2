"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useZodForm,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { PreSignUpCredentialsFormType } from "./pre-signup.schema";
import { PreSignUpCredentialsFormScheme } from "./pre-signup.schema";

export const PreSignUpCredentialsForm = () => {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan"); // e.g., 'pro_monthly', 'premium_monthly'
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useZodForm({
    schema: PreSignUpCredentialsFormScheme,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      verifyPassword: "",
    },
  });

  const onSubmit = async (values: PreSignUpCredentialsFormType) => {
    if (values.password !== values.verifyPassword) {
      form.setError("verifyPassword", {
        message: "Les mots de passe ne correspondent pas",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Créer la pré-inscription
      const response = await fetch("/api/auth/pre-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          selectedPlan: selectedPlan || "free",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la pré-inscription");
      }

      // Stocker l'ID de pré-inscription pour le webhook Stripe
      localStorage.setItem("preRegistrationId", data.preRegistrationId);

      toast.success(
        "Compte créé avec succès ! Redirection vers votre dashboard...",
      );

      // Rediriger vers Stripe
      if (selectedPlan && selectedPlan !== "free") {
        window.location.href = `/api/stripe/create-checkout-session?plan=${selectedPlan}&preRegistrationId=${data.preRegistrationId}`;
      } else {
        // Pour le plan gratuit, créer directement le compte
        window.location.href = `/api/auth/create-account-from-pre-registration?preRegistrationId=${data.preRegistrationId}`;
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de la pré-inscription",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      form={form}
      onSubmit={async (values) => {
        return onSubmit(values);
      }}
      className="max-w-lg space-y-4"
    >
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nom complet</FormLabel>
            <FormControl>
              <Input placeholder="Jean Dupont" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="jean@dupont.com" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mot de passe</FormLabel>
            <FormControl>
              <Input type="password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="verifyPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Confirmer le mot de passe</FormLabel>
            <FormControl>
              <Input type="password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Création en cours...
          </>
        ) : (
          "Créer mon compte gratuit"
        )}
      </Button>
    </Form>
  );
};
