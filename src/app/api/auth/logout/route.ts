import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthCookieOptions } from "@/lib/auth";
import { apiHandler } from "@/lib/errors";

export const POST = apiHandler(async () => {
  const cookieStore = await cookies();
  const cookieOpts = getAuthCookieOptions();
  cookieStore.set(cookieOpts.name, "", {
    ...cookieOpts,
    maxAge: 0,
  });

  return NextResponse.json({ message: "Logged out successfully" });
});
