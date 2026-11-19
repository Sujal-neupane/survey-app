import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireSurveyOwner } from "@/lib/auth";
import { apiHandler, ApiError } from "@/lib/errors";
import { aggregate } from "@/lib/survey/analytics";
import type { SurveySchema, Question } from "@/lib/survey/types";

export const GET = apiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireAuth();
  await requireSurveyOwner(id, session.userId);

  const url = new URL(req.url);
  const versionParam = url.searchParams.get("version");

  // Fetch survey with versions
  const survey = await db.survey.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          title: true,
          schema: true,
        },
      },
    },
  });

  if (!survey || survey.versions.length === 0) {
    throw new ApiError(404, "Survey has no published versions yet", "NOT_FOUND");
  }

  const availableVersions = survey.versions.map((v) => v.version);
  const latestVersion = survey.versions[0];

  let targetVersionNumber: number | "all" = latestVersion.version;
  if (versionParam === "all") {
    targetVersionNumber = "all";
  } else if (versionParam) {
    const num = parseInt(versionParam, 10);
    if (!isNaN(num) && availableVersions.includes(num)) {
      targetVersionNumber = num;
    }
  }

  // Determine which responses and schema to use
  let targetVersionIds: string[] = [];
  let baseSchema: SurveySchema;

  if (targetVersionNumber === "all") {
    targetVersionIds = survey.versions.map((v) => v.id);

    // Merge questions across all versions by questionId
    const questionMap = new Map<string, Question>();
    for (const v of survey.versions.slice().reverse()) {
      const vSchema = v.schema as SurveySchema;
      if (vSchema?.questions) {
        for (const q of vSchema.questions) {
          const existing = questionMap.get(q.id);
          if (!existing) {
            questionMap.set(q.id, { ...q });
          } else if (
            (existing.type === "single_choice" || existing.type === "multi_choice") &&
            (q.type === "single_choice" || q.type === "multi_choice")
          ) {
            // Merge options
            const optMap = new Map(existing.options.map((o) => [o.id, o]));
            for (const opt of q.options) {
              if (!optMap.has(opt.id)) {
                optMap.set(opt.id, opt);
              }
            }
            existing.options = Array.from(optMap.values());
          }
        }
      }
    }
    baseSchema = { questions: Array.from(questionMap.values()) };
  } else {
    const selectedVersionRecord = survey.versions.find((v) => v.version === targetVersionNumber)!;
    targetVersionIds = [selectedVersionRecord.id];
    baseSchema = selectedVersionRecord.schema as SurveySchema;
  }

  // Fetch completed responses for targeted version(s)
  const responses = await db.response.findMany({
    where: {
      surveyVersionId: { in: targetVersionIds },
      status: "COMPLETE",
    },
    select: {
      id: true,
      surveyVersionId: true,
      answers: true,
      status: true,
      createdAt: true,
      submittedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const analytics = aggregate(baseSchema, responses as any, availableVersions);

  return NextResponse.json({
    analytics,
    versions: availableVersions,
    selectedVersion: targetVersionNumber,
    lastResponseAt: responses[0]?.submittedAt || responses[0]?.createdAt || null,
  });
});
