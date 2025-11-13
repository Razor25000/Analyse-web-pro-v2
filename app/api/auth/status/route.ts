import { getUser } from "@/lib/auth/auth-user";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getUser();

    if (user) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      });
    } else {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
