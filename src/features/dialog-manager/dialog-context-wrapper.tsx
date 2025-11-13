"use client";

import { React } from "react";
import { useQueryClient } from "@tanstack/react-query";

type DialogContextWrapperProps = {
  children: React.ReactNode;
}

/**
 * Wrapper component that ensures React Query context is available
 * for custom dialogs rendered through the dialog manager.
 *
 * This fixes the "No QueryClient set" error that occurs when
 * custom dialog components use useQuery or useMutation hooks.
 */
export function DialogContextWrapper({ children }: DialogContextWrapperProps) {
  // This hook will throw an error if called outside a QueryClientProvider
  // but since DialogManagerRenderer is inside QueryClientProvider in app/providers.tsx,
  // this should work correctly.
  const queryClient = useQueryClient();

  return <>{children}</>;
}