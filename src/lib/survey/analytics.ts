import type { SurveySchema, Answers } from "./types";

export interface ResponseItem {
  id: string;
  surveyVersionId: string;
  versionNumber?: number;
  answers: unknown;
  status: "COMPLETE" | "PARTIAL";
  createdAt: string | Date;
  submittedAt?: string | Date | null;
}

export interface ChoiceOptionStat {
  id: string;
  label: string;
  count: number;
  percent: number;
}

export interface RatingDistributionItem {
  value: number;
  count: number;
}

export interface TextRecentItem {
  text: string;
  submittedAt: string;
}

export type QuestionAnalytics =
  | {
      questionId: string;
      label: string;
      type: "single_choice" | "multi_choice";
      answeredCount: number;
      options: ChoiceOptionStat[];
    }
  | {
      questionId: string;
      label: string;
      type: "rating";
      answeredCount: number;
      average: number;
      distribution: RatingDistributionItem[];
    }
  | {
      questionId: string;
      label: string;
      type: "text";
      answeredCount: number;
      recent: TextRecentItem[];
      hasMore: boolean;
    };

export interface AnalyticsResult {
  totalResponses: number;
  versions: number[];
  questions: QuestionAnalytics[];
}

export function aggregate(
  schema: SurveySchema,
  responses: ResponseItem[],
  availableVersions: number[] = [1]
): AnalyticsResult {
  const completeResponses = responses.filter((r) => r.status === "COMPLETE");
  const totalResponses = completeResponses.length;

  const questionsAnalytics: QuestionAnalytics[] = schema.questions.map((q) => {
    switch (q.type) {
      case "single_choice": {
        const optionMap = new Map<string, { label: string; count: number }>();
        for (const opt of q.options) {
          optionMap.set(opt.id, { label: opt.label, count: 0 });
        }

        let answeredCount = 0;
        for (const r of completeResponses) {
          const ans = (r.answers as Answers)?.[q.id];
          if (typeof ans === "string") {
            answeredCount++;
            const entry = optionMap.get(ans);
            if (entry) {
              entry.count++;
            } else {
              optionMap.set(ans, { label: ans, count: 1 });
            }
          }
        }

        const options: ChoiceOptionStat[] = Array.from(optionMap.entries()).map(([id, data]) => ({
          id,
          label: data.label,
          count: data.count,
          percent: answeredCount > 0 ? Math.round((data.count / answeredCount) * 1000) / 10 : 0,
        }));

        return {
          questionId: q.id,
          label: q.label,
          type: "single_choice",
          answeredCount,
          options,
        };
      }

      case "multi_choice": {
        const optionMap = new Map<string, { label: string; count: number }>();
        for (const opt of q.options) {
          optionMap.set(opt.id, { label: opt.label, count: 0 });
        }

        let answeredCount = 0;
        for (const r of completeResponses) {
          const ans = (r.answers as Answers)?.[q.id];
          if (Array.isArray(ans) && ans.length > 0) {
            answeredCount++;
            for (const item of ans) {
              if (typeof item === "string") {
                const entry = optionMap.get(item);
                if (entry) {
                  entry.count++;
                } else {
                  optionMap.set(item, { label: item, count: 1 });
                }
              }
            }
          }
        }

        const options: ChoiceOptionStat[] = Array.from(optionMap.entries()).map(([id, data]) => ({
          id,
          label: data.label,
          count: data.count,
          percent: answeredCount > 0 ? Math.round((data.count / answeredCount) * 1000) / 10 : 0,
        }));

        return {
          questionId: q.id,
          label: q.label,
          type: "multi_choice",
          answeredCount,
          options,
        };
      }

      case "rating": {
        const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let sum = 0;
        let answeredCount = 0;

        for (const r of completeResponses) {
          const ans = (r.answers as Answers)?.[q.id];
          if (typeof ans === "number" && ans >= 1 && ans <= 5) {
            answeredCount++;
            sum += ans;
            dist[ans] = (dist[ans] || 0) + 1;
          }
        }

        const distribution: RatingDistributionItem[] = [1, 2, 3, 4, 5].map((val) => ({
          value: val,
          count: dist[val] || 0,
        }));

        const average =
          answeredCount > 0 ? Math.round((sum / answeredCount) * 10) / 10 : 0;

        return {
          questionId: q.id,
          label: q.label,
          type: "rating",
          answeredCount,
          average,
          distribution,
        };
      }

      case "text": {
        const texts: TextRecentItem[] = [];

        for (const r of completeResponses) {
          const ans = (r.answers as Answers)?.[q.id];
          if (typeof ans === "string" && ans.trim().length > 0) {
            const dateStr =
              r.submittedAt instanceof Date
                ? r.submittedAt.toISOString()
                : typeof r.submittedAt === "string"
                ? r.submittedAt
                : typeof r.createdAt === "string"
                ? r.createdAt
                : r.createdAt instanceof Date
                ? r.createdAt.toISOString()
                : new Date().toISOString();

            texts.push({
              text: ans.trim(),
              submittedAt: dateStr,
            });
          }
        }

        // Sort latest first
        texts.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );

        const answeredCount = texts.length;
        const recent = texts.slice(0, 20);
        const hasMore = texts.length > 20;

        return {
          questionId: q.id,
          label: q.label,
          type: "text",
          answeredCount,
          recent,
          hasMore,
        };
      }
    }
  });

  return {
    totalResponses,
    versions: availableVersions,
    questions: questionsAnalytics,
  };
}
