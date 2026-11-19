import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireSurveyOwner } from "@/lib/auth";
import { apiHandler, ApiError } from "@/lib/errors";
import type { SurveySchema, Question } from "@/lib/survey/types";

export const GET = apiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const session = await requireAuth();
  await requireSurveyOwner(id, session.userId);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10)));
  const versionParam = url.searchParams.get("version");

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
    throw new ApiError(404, "Survey has no versions", "NOT_FOUND");
  }

  // Build a lookup map of questionId and optionId -> labels across all versions
  const questionMap = new Map<string, { label: string; type: string; options: Map<string, string> }>();

  for (const v of survey.versions) {
    const vSchema = v.schema as SurveySchema;
    if (vSchema?.questions) {
      for (const q of vSchema.questions) {
        if (!questionMap.has(q.id)) {
          const optMap = new Map<string, string>();
          if (q.type === "single_choice" || q.type === "multi_choice") {
            for (const opt of q.options) {
              optMap.set(opt.id, opt.label);
            }
          }
          questionMap.set(q.id, {
            label: q.label,
            type: q.type,
            options: optMap,
          });
        } else {
          // Merge any options from other versions
          if (q.type === "single_choice" || q.type === "multi_choice") {
            const entry = questionMap.get(q.id)!;
            for (const opt of q.options) {
              if (!entry.options.has(opt.id)) {
                entry.options.set(opt.id, opt.label);
              }
            }
          }
        }
      }
    }
  }

  // Filter by version if specified
  let targetVersionIds: string[] = survey.versions.map((v) => v.id);
  if (versionParam && versionParam !== "all") {
    const vNum = parseInt(versionParam, 10);
    const matched = survey.versions.find((v) => v.version === vNum);
    if (matched) {
      targetVersionIds = [matched.id];
    }
  }

  const whereClause = {
    surveyVersionId: { in: targetVersionIds },
    status: "COMPLETE" as const,
  };

  const [total, rawResponses] = await Promise.all([
    db.response.count({ where: whereClause }),
    db.response.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        surveyVersion: {
          select: { version: true },
        },
      },
    }),
  ]);

  // Format responses with mapped labels
  const formattedResponses = rawResponses.map((r) => {
    const rawAnswers = (r.answers as Record<string, any>) || {};
    const formattedAnswers: Array<{
      questionId: string;
      label: string;
      type: string;
      value: any;
      displayValue: string;
    }> = [];

    for (const [qId, val] of Object.entries(rawAnswers)) {
      const qMeta = questionMap.get(qId);
      const label = qMeta?.label || qId;
      const type = qMeta?.type || "unknown";

      let displayValue = String(val);
      if (qMeta?.type === "single_choice" && typeof val === "string") {
        displayValue = qMeta.options.get(val) || val;
      } else if (qMeta?.type === "multi_choice" && Array.isArray(val)) {
        displayValue = val.map((v) => qMeta.options.get(v) || v).join(", ");
      } else if (qMeta?.type === "rating") {
        displayValue = `${val} / 5 ★`;
      }

      formattedAnswers.push({
        questionId: qId,
        label,
        type,
        value: val,
        displayValue,
      });
    }

    return {
      id: r.id,
      version: r.surveyVersion.version,
      submittedAt: r.submittedAt || r.createdAt,
      answers: formattedAnswers,
    };
  });

  return NextResponse.json({
    responses: formattedResponses,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    versions: survey.versions.map((v) => v.version),
  });
});
