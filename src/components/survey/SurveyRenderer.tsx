"use client";

import { useState, useMemo } from "react";
import type { SurveySchema, Answers } from "@/lib/survey/types";
import { getVisibleQuestionIds, isEmpty } from "@/lib/survey/visibility";
import { validateAnswers } from "@/lib/survey/validate";
import { QuestionField } from "./QuestionField";
import { ProgressBar } from "./ProgressBar";
import { Send, CheckCircle2, RotateCcw } from "lucide-react";

interface SurveyRendererProps {
  title: string;
  description?: string;
  schema: SurveySchema;
  initialAnswers?: Answers;
  isPreview?: boolean;
  onSubmit?: (answers: Answers, honeypotWebsite?: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function SurveyRenderer({
  title,
  description,
  schema,
  initialAnswers = {},
  isPreview = false,
  onSubmit,
  isSubmitting = false,
}: SurveyRendererProps) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Compute visible question IDs dynamically
  const visibleIds = useMemo(() => {
    return getVisibleQuestionIds(schema, answers);
  }, [schema, answers]);

  // Filter visible questions in original schema order
  const visibleQuestions = useMemo(() => {
    return schema.questions.filter((q) => visibleIds.has(q.id));
  }, [schema, visibleIds]);

  // Compute progress: answered visible questions / total visible questions
  const answeredCount = useMemo(() => {
    let count = 0;
    for (const q of visibleQuestions) {
      if (!isEmpty(answers[q.id])) {
        count++;
      }
    }
    return count;
  }, [visibleQuestions, answers]);

  const handleAnswerChange = (questionId: string, val: string | number | string[]) => {
    // 1. Update answer for this question
    const candidateAnswers: Answers = {
      ...answers,
      [questionId]: val,
    };

    // 2. Re-evaluate visibility live
    const nextVisibleIds = getVisibleQuestionIds(schema, candidateAnswers);

    // 3. Automatically prune answers for questions that became hidden
    const prunedAnswers: Answers = {};
    for (const [key, value] of Object.entries(candidateAnswers)) {
      if (nextVisibleIds.has(key)) {
        prunedAnswers[key] = value;
      }
    }

    setAnswers(prunedAnswers);

    // Clear error on change if present
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) return;

    const validation = validateAnswers(schema, answers, { partial: false });
    if (!validation.ok) {
      setErrors(validation.errors);

      // Scroll to first error field
      const firstErrorKey = Object.keys(validation.errors)[0];
      if (firstErrorKey) {
        const el = document.getElementById(`container-${firstErrorKey}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    setErrors({});
    if (onSubmit) {
      await onSubmit(validation.answers, honeypot);
      setSubmitted(true);
    }
  };

  if (submitted && !isPreview) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Thank you!</h2>
        <p className="text-slate-600 text-sm">
          Your response has been successfully recorded. We appreciate your feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {title || "Untitled Survey"}
        </h1>
        {description && (
          <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <ProgressBar
        completed={answeredCount}
        total={visibleQuestions.length}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot field (hidden from legitimate users, bots fill it) */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {visibleQuestions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300 text-sm">
            No questions to display.
          </div>
        ) : (
          visibleQuestions.map((q) => (
            <QuestionField
              key={q.id}
              question={q}
              value={answers[q.id]}
              error={errors[q.id]}
              onChange={(val) => handleAnswerChange(q.id, val)}
              disabled={isSubmitting}
            />
          ))
        )}

        <div className="pt-4">
          {isPreview ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
              <span>Preview Mode: form submission is disabled here.</span>
              <button
                type="button"
                onClick={() => setAnswers({})}
                className="inline-flex items-center gap-1 text-amber-900 hover:underline font-medium"
              >
                <RotateCcw className="w-3 h-3" /> Reset answers
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || visibleQuestions.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? "Submitting..." : "Submit Response"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
