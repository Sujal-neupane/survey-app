import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { apiHandler, ApiError } from "@/lib/errors";

export const GET = apiHandler(async () => {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "Not authenticated", "UNAUTHORIZED");
  }

  return NextResponse.json({
    id: session.userId,
    email: session.email,
  });
});
