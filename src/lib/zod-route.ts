// app/api/hello/route.ts
import { createZodRoute } from "next-zod-route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthPermissionSchema, RolesKeys } from "./auth/auth-permissions";
import { getUser } from "./auth/auth-user";
import { logger } from "./logger";
import { getCurrentOrg } from "./organizations/get-org";

export class ZodRouteError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status ?? 400;
  }
}

export const route = createZodRoute({
  handleServerError: (e: Error) => {
    if (e instanceof ZodRouteError) {
      logger.debug("[DEV] - ZodRouteError", e);
      return NextResponse.json(
        { message: e.message },
        {
          status: e.status,
        },
      );
    }

    logger.info("Unknown Error", e);

    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ message: e.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  },
});

export const authRoute = route.use(async ({ next }) => {
  const user = await getUser();

  if (!user) {
    throw new ZodRouteError("Session not found!", 401);
  }

  return next({
    ctx: { user },
  });
});

export const orgRoute = route
  .defineMetadata(
    z.object({
      roles: z.array(z.enum(RolesKeys)).optional(),
      permissions: AuthPermissionSchema.optional(),
    }),
  )
  .use(async ({ next, metadata }) => {
    const organization = await getCurrentOrg(metadata);

    if (!organization) {
      throw new ZodRouteError(
        "You need to be part of an organization to access this resource.",
        401,
      );
    }

    return next({
      ctx: { organization },
    });
  });
