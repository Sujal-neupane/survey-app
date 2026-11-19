import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signToken, getAuthCookieOptions } from "@/lib/auth";
import { apiHandler, ApiError } from "@/lib/errors";

const RegisterSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const POST = apiHandler(async (req: Request) => {
  const body = await req.json();
  const { email, password } = RegisterSchema.parse(body);

  const existing = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    throw new ApiError(409, "A user with this email already exists", "EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
    },
    select: {
      id: true,
      email: true,
    },
  });

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
    { status: 201 }
  );
});
