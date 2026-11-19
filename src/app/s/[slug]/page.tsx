"use client";

import { useState, useEffect, use, useRef } from "react";
import type { SurveySchema, Answers } from "@/lib/survey/types";
import { SurveyRenderer } from "@/components/survey/SurveyRenderer";
import { nanoid } from "nanoid";
import {
  AlertCircle,
  Lock,
  Loader2,
  RotateCcw,
  CheckCircle2,
  FileQuestion,
  Clock,
} from "lucide-react";

interface SurveyResponseData {
  title: string;
  description: string;
  schema: SurveySchema;
  version: number;
  slug: string;
}

export default function PublicSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SurveyResponseData | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  // Partial draft & resume state
  const [draftToken, setDraftToken] = useState<string>("");
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [restoredAnswers, setRestoredAnswers] = useState<Answers>({});
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);

  // Duplicate submission state
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load survey schema from API
  const loadSurvey = async () => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/public/surveys/${slug}`);
      if (!res.ok) {
        setErrorStatus(res.status);
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 429) {
          const retryHeader = res.headers.get("Retry-After");
          setRetryAfter(retryHeader ? parseInt(retryHeader, 10) : 60);
        }
        throw new Error(errJson.error?.message || "Failed to load survey");
      }

      const surveyData: SurveyResponseData = await res.json();
      setData(surveyData);

      // Check duplicate cookie
      if (document.cookie.includes(`submitted_${slug}=1`)) {
        setAlreadySubmitted(true);
      }

      // Check localStorage for saved draft
      const localDraftKey = `survey_draft_${slug}`;
      const savedLocal = localStorage.getItem(localDraftKey);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (parsed && typeof parsed.answers === "object") {
            setRestoredAnswers(parsed.answers);
            setDraftToken(parsed.draftToken || nanoid(12));
            setHasSavedDraft(true);
          }
        } catch {
          // ignore corrupted local draft
        }
      } else {
        setDraftToken(nanoid(12));
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSurvey();
  }, [slug]);

  // Handle final submission
  const handleSubmit = async (answers: Answers, honeypotWebsite?: string) => {
    if (!data) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/public/surveys/${slug}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          version: data.version,
          draftToken,
          website: honeypotWebsite,
        }),
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error?.message || "Submission failed");
      }

      // Clear local draft on successful submission
      localStorage.removeItem(`survey_draft_${slug}`);
      setAlreadySubmitted(true);
    } catch (err: any) {
      alert(err.message || "Failed to submit response");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6 animate-pulse">
          <div className="h-7 bg-slate-200 rounded-md w-3/4" />
          <div className="h-4 bg-slate-100 rounded-md w-full" />
          <div className="h-3 bg-slate-100 rounded-full w-full" />
          <div className="space-y-4 pt-4">
            <div className="h-28 bg-slate-100 rounded-xl w-full" />
            <div className="h-28 bg-slate-100 rounded-xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Rate Limited State (429)
  if (errorStatus === 429) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-amber-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Too Many Requests
          </h2>
          <p className="text-sm text-slate-600">
            You have made too many requests in a short period. Please wait a few seconds and try again.
          </p>
          <button
            type="button"
            onClick={loadSurvey}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Retry Now
          </button>
        </div>
      </div>
    );
  }

  // Survey Closed State (410)
  if (errorStatus === 410) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Survey Closed
          </h2>
          <p className="text-sm text-slate-600">
            This survey is no longer accepting new responses. Thank you for your interest!
          </p>
        </div>
      </div>
    );
  }

  // Not Found State (404)
  if (errorStatus === 404 || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto">
            <FileQuestion className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Survey Not Found
          </h2>
          <p className="text-sm text-slate-600">
            The survey link you entered does not exist or has not been published yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Banner if already submitted */}
      {alreadySubmitted && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 text-xs text-blue-800 text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>You have already submitted a response to this survey. Submitting again will record another response.</span>
        </div>
      )}

      {/* Resume Draft Banner */}
      {hasSavedDraft && !draftBannerDismissed && Object.keys(restoredAnswers).length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-xs text-amber-900 flex items-center justify-between max-w-2xl mx-auto w-full mt-4 rounded-xl shadow-xs">
          <span>We restored your previous unsaved draft responses.</span>
          <button
            type="button"
            onClick={() => {
              setRestoredAnswers({});
              setDraftBannerDismissed(true);
              localStorage.removeItem(`survey_draft_${slug}`);
            }}
            className="text-amber-800 hover:text-red-700 underline font-medium"
          >
            Start over
          </button>
        </div>
      )}

      {/* Survey Renderer Form */}
      <main className="flex-1 py-8">
        <SurveyRenderer
          title={data.title}
          description={data.description}
          schema={data.schema}
          initialAnswers={restoredAnswers}
          onSubmit={handleSubmit}
          isSubmitting={submitting}
        />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        Powered by <span className="font-semibold text-slate-600">Survey Studio</span>
      </footer>
    </div>
  );
}
