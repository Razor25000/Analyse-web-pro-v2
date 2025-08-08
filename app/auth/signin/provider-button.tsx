import { Logo } from "@/components/nowts/logo";
import { LoadingButton } from "@/features/form/submit-button";
import { authClient } from "@/lib/auth-client";
import { getCallbackUrl } from "@/lib/auth/auth-utils";
import { useMutation } from "@tanstack/react-query";
import { clsx } from "clsx";
import type { ReactNode } from "react";

const ProviderData: Record<string, { icon: ReactNode; name: string }> = {
  github: {
    icon: <Logo name="github" size={16} />,
    name: "Github",
  },
  google: {
    icon: <Logo name="google" size={16} />,
    name: "Google",
  },
};

type ProviderButtonProps = {
  providerId: "github" | "google";
  callbackUrl?: string;
};

export const ProviderButton = (props: ProviderButtonProps) => {
  const githubSignInMutation = useMutation({
    mutationFn: async () => {
      await authClient.signIn.social({
        provider: props.providerId,
        callbackURL: getCallbackUrl(props.callbackUrl ?? "/account"),
      });
    },
  });

  const data = ProviderData[props.providerId];

  return (
    <LoadingButton
      loading={githubSignInMutation.isPending}
      className={clsx({
        "border bg-white text-black hover:bg-white dark:border-neutral-700":
          data.name === "Google",
        "border bg-black text-white hover:bg-gray-950 dark:border-neutral-700":
          data.name === "Github",
      })}
      size="lg"
      onClick={() => {
        githubSignInMutation.mutate();
      }}
    >
      {data.icon}
      <span className="ml-2">Sign in with {data.name}</span>
    </LoadingButton>
  );
};
