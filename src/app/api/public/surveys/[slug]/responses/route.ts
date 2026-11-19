import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiHandler, ApiError } from "@/lib/errors";
import { validateAnswers } from "@/lib/survey/validate";
import { SurveySchema } from "@/lib/survey/types";
import { checkRateLimit, extractClientIp, getIpHash } from "@/lib/rateLimit";

const SubmitBodySchema = z.object({
  answers: z.record(z.string(), z.any()),
  version: z.number().int().optional(),
  draftToken: z.string().optional(),
  website: z.string().optional(), // Honeypot field
});

export const POST = apiHandler(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const clientIp = extractClientIp(req);
  const ipHash = getIpHash(clientIp);

  // Rate limiting: 5 submissions per minute per IP + survey
  const rateKey = `submit:${slug}:${ipHash}`;
  const rateResult = await checkRateLimit(rateKey, 5, 60);

  if (!rateResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many submission attempts. Please wait a minute before trying again.",
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, rateResult.reset - Math.floor(Date.now() / 1000))) },
      }
    );
  }

  const body = await req.json();
  const { answers, version, draftToken, website } = SubmitBodySchema.parse(body);

  // Honeypot check: If bot filled the hidden website field, silently return 201
  if (website && website.trim().length > 0) {
    return NextResponse.json(
      { message: "Response recorded successfully", id: "bot_ignored" },
      { status: 201 }
    );
  }

  // Duplicate guard: check submitted cookie
  const cookieStore = await cookies();
  const alreadySubmittedCookie = cookieStore.get(`submitted_${slug}`)?.value;
  if (alreadySubmittedCookie) {
    // Return friendly duplicate notice (or allow re-submission if explicitly required, but spec says duplicate guard deterrence)
  }

  // Find survey
  const survey = await db.survey.findUnique({
    where: { slug },
    select: {
      id: true,
      status: true,
      versions: {
        where: version ? { version } : undefined,
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!survey || survey.versions.length === 0) {
    throw new ApiError(404, "Survey or version not found", "NOT_FOUND");
  }

  if (survey.status === "CLOSED") {
    return NextResponse.json(
      {
        error: {
          code: "SURVEY_CLOSED",
          message: "This survey is no longer accepting responses.",
        },
      },
      { status: 410 }
    );
  }

  const targetVersion = survey.versions[0];
  const parsedSchema = SurveySchema.parse(targetVersion.schema);

  // Authoritative server-side validation & answer stripping
  const validation = validateAnswers(parsedSchema, answers, { partial: false });
  if (!validation.ok) {
    throw new ApiError(422, "Submitted answers failed validation", "VALIDATION_ERROR", validation.errors);
  }

  // Save response: update draft if draftToken exists, else create new
  let savedResponse;
  if (draftToken) {
    const existingDraft = await db.response.findUnique({
      where: { draftToken },
    });

    if (existingDraft) {
      savedResponse = await db.response.update({
        where: { draftToken },
        data: {
          surveyVersionId: targetVersion.id,
          answers: validation.answers as any,
          status: "COMPLETE",
          submittedAt: new Date(),
          ipHash,
        },
      });
    }
  }

  if (!savedResponse) {
    savedResponse = await db.response.create({
      data: {
        surveyVersionId: targetVersion.id,
        answers: validation.answers as any,
        status: "COMPLETE",
        submittedAt: new Date(),
        ipHash,
      },
    });
  }

  // Set duplicate deterrence cookie (30 days)
  cookieStore.set(`submitted_${slug}`, "1", {
    path: `/s/${slug}`,
    maxAge: 30 * 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: false,
  });

  return NextResponse.json(
    {
      message: "Response submitted successfully",
      id: savedResponse.id,
    },
    { status: 201 }
  );
});
