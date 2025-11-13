import { headers } from "next/headers";
import { auth } from "../auth";
import type { AuthPermission } from "./auth-permissions";
import { getRequiredUser } from "./auth-user";

export const hasPermission = async (permission: AuthPermission) => {
  try {
    const user = await getRequiredUser();

    // For now, return true for all permissions as this is a B2C app
    // TODO: Implement proper permission checking based on user subscription tier
    return true;
  } catch {
    return false;
  }
};
