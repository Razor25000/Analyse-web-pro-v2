import { betterAuth } from "better-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Finalizes user registration by creating a BetterAuth session
 * This solves the issue where users are redirected to sign-in after account creation
 */
export async function finalizeRegistration(userId: string, email: string) {
  try {
    // Import auth dynamically to avoid circular dependencies
    const { auth } = await import("@/lib/auth");

    // Get BetterAuth instance
    const authInstance = auth;

    // Create session for the user
    // This is the key step that was missing - creating a BetterAuth session
    // after manual account creation
    const session = await authInstance.api.getSession({
      userId,
      headers: await headers(),
    });

    // If session doesn't exist, create one
    if (!session) {
      // Create a new session for the user
      const newSession = await authInstance.api.signIn({
        email,
        password: null, // Password will be verified from the account
        options: {
          createUser: false, // User already exists
        },
        headers: await headers(),
      });

      if (newSession?.session) {
        console.log("✅ Session created for user:", { userId, email });
        return { success: true, session: newSession.session };
      }
    } else {
      console.log("✅ Session already exists for user:", { userId, email });
      return { success: true, session };
    }
  } catch (error) {
    console.error("❌ Error finalizing registration:", error);

    // Fallback: redirect to sign-in with success message
    return {
      success: false,
      error: "Session creation failed",
      redirectUrl: `/auth/signin?accountCreated=true&email=${encodeURIComponent(email)}`,
    };
  }
}

/**
 * Creates a BetterAuth session for a user after manual account creation
 * This is used when accounts are created outside of BetterAuth's normal flow
 */
export async function createBetterAuthSession(userId: string, email: string) {
  try {
    // Import auth dynamically to avoid circular dependencies
    const { auth } = await import("@/lib/auth");

    // Get user's account to verify credentials
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });

    if (!user || !user.accounts.length) {
      throw new Error("User or account not found");
    }

    // Find the credential account
    const credentialAccount = user.accounts.find(
      (account) => account.providerId === "credential",
    );

    if (!credentialAccount) {
      throw new Error("No credential account found");
    }

    // Create session using BetterAuth's internal API
    const session = await auth.api.signIn({
      email,
      password: credentialAccount.password, // Use the stored hashed password
      options: {
        createUser: false, // User already exists
      },
      headers: await headers(),
    });

    if (session?.session) {
      console.log("✅ BetterAuth session created:", { userId, email });
      return { success: true, session: session.session };
    } else {
      throw new Error("Failed to create session");
    }
  } catch (error) {
    console.error("❌ Error creating BetterAuth session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
