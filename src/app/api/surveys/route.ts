import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { apiHandler } from "@/lib/errors";
import { slugify } from "@/lib/slug";
import type { SurveySchema } from "@/lib/survey/types";

const CreateSurveySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional().default(""),
});

export const GET = apiHandler(async () => {
  const session = await requireAuth();

  const surveys = await db.survey.findMany({
    where: { ownerId: session.userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      slug: true,
      updatedAt: true,
      createdAt: true,
      versions: {
        select: {
          version: true,
          _count: {
            select: {
              responses: {
                where: { status: "COMPLETE" },
              },
            },
          },
        },
      },
    },
  });

  const formatted = surveys.map((s) => {
    const responseCount = s.versions.reduce(
      (acc, v) => acc + v._count.responses,
      0
    );
    const latestVersion = s.versions.reduce(
      (max, v) => (v.version > max ? v.version : max),
      0
    );

    return {
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      slug: s.slug,
      responseCount,
      latestVersion,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    };
  });

  return NextResponse.json({ surveys: formatted });
});

export const POST = apiHandler(async (req: Request) => {
  const session = await requireAuth();
  const body = await req.json();
  const { title, description } = CreateSurveySchema.parse(body);

  const initialSchema: SurveySchema = {
    questions: [
      {
        id: nanoid(8),
        type: "text",
        label: "Untitled Question",
        helpText: "",
        required: false,
        maxLength: 1000,
      },
    ],
  };

  const slug = slugify(title);

  const survey = await db.survey.create({
    data: {
      title,
      description,
      slug,
      ownerId: session.userId,
      draftSchema: initialSchema as unknown as Prisma.InputJsonValue,
      status: "DRAFT",
    },
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      status: true,
      draftSchema: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ survey }, { status: 201 });
});
