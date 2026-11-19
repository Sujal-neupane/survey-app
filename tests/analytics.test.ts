import { describe, it, expect } from "vitest";
import { aggregate } from "../src/lib/survey/analytics";
import type { SurveySchema } from "../src/lib/survey/types";
import type { ResponseItem } from "../src/lib/survey/analytics";

describe("aggregate", () => {
  const schema: SurveySchema = {
    questions: [
      {
        id: "q_choice",
        type: "single_choice",
        label: "Choice Q",
        required: true,
        options: [
          { id: "opt1", label: "Option 1" },
          { id: "opt2", label: "Option 2" },
        ],
      },
      {
        id: "q_rating",
        type: "rating",
        label: "Rating Q",
        min: 1,
        max: 5,
        required: false,
      },
      {
        id: "q_text",
        type: "text",
        label: "Text Q",
        maxLength: 500,
        required: false,
      },
    ],
  };

  it("filters out PARTIAL responses and counts only COMPLETE responses", () => {
    const responses: ResponseItem[] = [
      {
        id: "r1",
        surveyVersionId: "v1",
        answers: { q_choice: "opt1", q_rating: 4 },
        status: "COMPLETE",
        createdAt: new Date().toISOString(),
      },
      {
        id: "r2",
        surveyVersionId: "v1",
        answers: { q_choice: "opt1", q_rating: 2 },
        status: "PARTIAL", // Must be ignored
        createdAt: new Date().toISOString(),
      },
      {
        id: "r3",
        surveyVersionId: "v1",
        answers: { q_choice: "opt2", q_rating: 5, q_text: "Great experience" },
        status: "COMPLETE",
        createdAt: new Date().toISOString(),
      },
    ];

    const result = aggregate(schema, responses, [1]);
    expect(result.totalResponses).toBe(2);

    // q_choice analytics
    const choiceQ = result.questions.find((q) => q.questionId === "q_choice");
    expect(choiceQ?.answeredCount).toBe(2);
    if (choiceQ && choiceQ.type === "single_choice") {
      const opt1 = choiceQ.options.find((o) => o.id === "opt1");
      const opt2 = choiceQ.options.find((o) => o.id === "opt2");
      expect(opt1?.count).toBe(1);
      expect(opt1?.percent).toBe(50);
      expect(opt2?.count).toBe(1);
      expect(opt2?.percent).toBe(50);
    }

    // q_rating analytics
    const ratingQ = result.questions.find((q) => q.questionId === "q_rating");
    expect(ratingQ?.answeredCount).toBe(2);
    if (ratingQ && ratingQ.type === "rating") {
      // (4 + 5) / 2 = 4.5
      expect(ratingQ.average).toBe(4.5);
      expect(ratingQ.distribution.find((d) => d.value === 4)?.count).toBe(1);
      expect(ratingQ.distribution.find((d) => d.value === 5)?.count).toBe(1);
      expect(ratingQ.distribution.find((d) => d.value === 1)?.count).toBe(0);
    }

    // q_text analytics
    const textQ = result.questions.find((q) => q.questionId === "q_text");
    expect(textQ?.answeredCount).toBe(1);
    if (textQ && textQ.type === "text") {
      expect(textQ.recent[0].text).toBe("Great experience");
      expect(textQ.hasMore).toBe(false);
    }
  });
});
