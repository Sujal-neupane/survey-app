import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { ApiError } from "./errors";

const COOKIE_NAME = "auth_token";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-minimum-32-characters-survey-platform";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  sub: string;
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (!payload.sub || typeof payload.sub !== "string") {
      return null;
    }
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ userId: string; email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.sub) return null;

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true },
  });

  if (!user) return null;
  return { userId: user.id, email: user.email };
}

export async function requireAuth(): Promise<{ userId: string; email: string }> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, "Authentication required", "UNAUTHORIZED");
  }
  return session;
}

export async function requireSurveyOwner(surveyId: string, userId: string) {
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
  });

  // Always return 404 if not found or not owner, preventing resource existence leaks
  if (!survey || survey.ownerId !== userId) {
    throw new ApiError(404, "Survey not found", "NOT_FOUND");
  }

  return survey;
}

export function getAuthCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: "/",
  };
}
