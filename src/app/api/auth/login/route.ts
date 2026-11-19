import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, getAuthCookieOptions } from "@/lib/auth";
import { apiHandler, ApiError } from "@/lib/errors";

const LoginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const POST = apiHandler(async (req: Request) => {
  const body = await req.json();
  const { email, password } = LoginSchema.parse(body);

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    // Generic message to avoid email enumeration
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const token = await signToken(user.id);
  const cookieStore = await cookies();
  const cookieOpts = getAuthCookieOptions();
  cookieStore.set(cookieOpts.name, token, cookieOpts);

  return NextResponse.json(
    {
      user: {
        id: user.id,
        email: user.email,
      },
    },
    { status: 200 }
  );
});
