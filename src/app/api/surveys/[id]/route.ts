import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireSurveyOwner } from "@/lib/auth";
import { apiHandler, ApiError } from "@/lib/errors";
import { SurveySchema } from "@/lib/survey/types";
import { validateSurveySchema } from "@/lib/survey/schemaChecks";

const UpdateSurveySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional().default(""),
  schema: SurveySchema,
});

export const GET = apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireAuth();
  await requireSurveyOwner(id, session.userId);

  const survey = await db.survey.findUnique({
    where: { id },
    include: {
      versions: {
        select: {
          id: true,
          version: true,
          title: true,
          publishedAt: true,
          _count: {
            select: { responses: { where: { status: "COMPLETE" } } },
          },
        },
        orderBy: { version: "desc" },
      },
    },
  });

  if (!survey) {
    throw new ApiError(404, "Survey not found", "NOT_FOUND");
  }

  const latestVersion = survey.versions[0]?.version ?? 0;

  return NextResponse.json({
    survey: {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      slug: survey.slug,
      draftSchema: survey.draftSchema,
      latestVersion,
      versions: survey.versions,
      createdAt: survey.createdAt,
      updatedAt: survey.updatedAt,
    },
  });
});

export const PUT = apiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireAuth();
  await requireSurveyOwner(id, session.userId);

  const body = await req.json();
  const { title, description, schema } = UpdateSurveySchema.parse(body);

  // Run business rule schema checks
  const schemaErrors = validateSurveySchema(schema);
  if (schemaErrors.length > 0) {
    throw new ApiError(422, "Survey schema validation failed", "SCHEMA_VALIDATION_ERROR", schemaErrors);
  }

  const updated = await db.survey.update({
    where: { id },
    data: {
      title,
      description,
      draftSchema: schema as any,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      slug: true,
      draftSchema: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ survey: updated });
});

export const DELETE = apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireAuth();
  await requireSurveyOwner(id, session.userId);

  await db.survey.delete({
    where: { id },
  });

  return NextResponse.json({ message: "Survey deleted successfully" });
});
