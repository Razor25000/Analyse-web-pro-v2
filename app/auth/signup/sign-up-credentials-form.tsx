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
import { authClient } from "@/lib/auth-client";
import { getCallbackUrl } from "@/lib/auth/auth-utils";
import { unwrapSafePromise } from "@/lib/promises";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { LoginCredentialsFormType } from "./signup.schema";
import { LoginCredentialsFormScheme } from "./signup.schema";

export const SignUpCredentialsForm = () => {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan"); // e.g., 'pro_monthly', 'premium_monthly'

  const form = useZodForm({
    schema: LoginCredentialsFormScheme,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      verifyPassword: "",
      image: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: LoginCredentialsFormType) => {
      return unwrapSafePromise(
        authClient.signUp.email({
          email: values.email,
          password: values.password,
          name: values.name,
          image: values.image,
        }),
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (data) => {
      // SÉCURITÉ: Bloquer les plans payants - rediriger vers pre-signup
      if (selectedPlan && selectedPlan !== "free") {
        toast.error("Erreur de sécurité détectée. Redirection...");
        window.location.href = `/auth/pre-signup?plan=${selectedPlan}&security=blocked`;
        return;
      }

      // Si un plan est sélectionné, rediriger vers Stripe
      if (selectedPlan && data?.user?.id) {
        toast.success("Compte créé ! Redirection vers le paiement...");
        // Créer une session Stripe checkout
        window.location.href = `/api/stripe/create-checkout-session?plan=${selectedPlan}&userId=${data.user.id}`;
      } else {
        // Redirection par défaut vers le dashboard (compte gratuit)
        const newUrl =
          window.location.origin + getCallbackUrl("/dashboard/audits");
        window.location.href = newUrl;
      }
    },
  });

  async function onSubmit(values: LoginCredentialsFormType) {
    if (values.password !== values.verifyPassword) {
      form.setError("verifyPassword", {
        message: "Password does not match",
      });
      return;
    }

    return submitMutation.mutateAsync(values);
  }

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
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="John Doe" {...field} />
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
              <Input placeholder="john@doe.com" {...field} />
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
            <FormLabel>Password</FormLabel>
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
            <FormLabel>Verify Password</FormLabel>
            <FormControl>
              <Input type="password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button type="submit" className="w-full">
        Sign up
      </Button>
    </Form>
  );
};
