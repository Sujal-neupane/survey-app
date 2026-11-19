import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireSurveyOwner } from "@/lib/auth";
import { apiHandler, ApiError } from "@/lib/errors";
import { SurveySchema } from "@/lib/survey/types";
import { validateSurveySchema } from "@/lib/survey/schemaChecks";

export const POST = apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireAuth();
  const survey = await requireSurveyOwner(id, session.userId);

  // Parse draft schema
  const parsedSchema = SurveySchema.safeParse(survey.draftSchema);
  if (!parsedSchema.success) {
    throw new ApiError(422, "Draft schema is malformed", "INVALID_SCHEMA", parsedSchema.error.flatten());
  }

  // Validate publishing rules
  const schemaErrors = validateSurveySchema(parsedSchema.data, {
    isPublishing: true,
    title: survey.title,
  });

  if (schemaErrors.length > 0) {
    throw new ApiError(422, "Cannot publish invalid survey", "PUBLISH_VALIDATION_ERROR", schemaErrors);
  }

  // Find highest version number
  const latestVersionRecord = await db.surveyVersion.findFirst({
    where: { surveyId: id },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (latestVersionRecord?.version ?? 0) + 1;

  // Create immutable snapshot and mark published in transaction
  const [createdVersion] = await db.$transaction([
    db.surveyVersion.create({
      data: {
        surveyId: id,
        version: nextVersion,
        title: survey.title,
        description: survey.description,
        schema: parsedSchema.data as any,
      },
    }),
    db.survey.update({
      where: { id },
      data: { status: "PUBLISHED" },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const publicUrl = `${appUrl}/s/${survey.slug}`;

  return NextResponse.json({
    version: createdVersion.version,
    publicUrl,
    publishedAt: createdVersion.publishedAt,
  });
});
