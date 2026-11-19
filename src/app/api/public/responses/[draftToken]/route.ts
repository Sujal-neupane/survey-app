import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { apiHandler, ApiError } from "@/lib/errors";
import { validateAnswers } from "@/lib/survey/validate";
import { SurveySchema } from "@/lib/survey/types";
import { checkRateLimit, extractClientIp, getIpHash } from "@/lib/rateLimit";

const PartialBodySchema = z.object({
  answers: z.record(z.string(), z.any()),
  slug: z.string(),
  version: z.number().int().optional(),
});

export const PATCH = apiHandler(async (req: Request, { params }: { params: Promise<{ draftToken: string }> }) => {
  const { draftToken } = await params;
  const clientIp = extractClientIp(req);
  const ipHash = getIpHash(clientIp);

  // Rate limit: 30 saves per minute per IP
  const rateResult = await checkRateLimit(`draft:${ipHash}`, 30, 60);
  if (!rateResult.success) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Draft autosave rate limited" } },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { answers, slug, version } = PartialBodySchema.parse(body);

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
    throw new ApiError(404, "Survey not found", "NOT_FOUND");
  }

  const targetVersion = survey.versions[0];
  const parsedSchema = SurveySchema.parse(targetVersion.schema);

  // Partial validation (skip required checks, validate types)
  const validation = validateAnswers(parsedSchema, answers, { partial: true });
  if (!validation.ok) {
    throw new ApiError(422, "Draft answers failed validation", "VALIDATION_ERROR", validation.errors);
  }

  // Upsert partial response
  const existing = await db.response.findUnique({
    where: { draftToken },
  });

  let saved;
  if (existing) {
    saved = await db.response.update({
      where: { draftToken },
      data: {
        answers: validation.answers as Prisma.InputJsonValue,
        surveyVersionId: targetVersion.id,
        status: "PARTIAL",
        ipHash,
      },
    });
  } else {
    saved = await db.response.create({
      data: {
        draftToken,
        answers: validation.answers as Prisma.InputJsonValue,
        surveyVersionId: targetVersion.id,
        status: "PARTIAL",
        ipHash,
      },
    });
  }

  return NextResponse.json({
    draftToken: saved.draftToken,
    updatedAt: saved.createdAt,
  });
});
