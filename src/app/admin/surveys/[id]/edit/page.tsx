"use client";

import { useState, useEffect, useMemo, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SurveySchema, Question } from "@/lib/survey/types";
import { validateSurveySchema } from "@/lib/survey/schemaChecks";
import { QuestionList } from "@/components/builder/QuestionList";
import { PreviewPane } from "@/components/builder/PreviewPane";
import {
  ArrowLeft,
  Check,
  CloudCheck,
  Eye,
  Edit3,
  Globe,
  Copy,
  ExternalLink,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SurveyData {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  slug: string;
  draftSchema: SurveySchema;
  latestVersion: number;
}

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  // Autosave status
  const [savingStatus, setSavingStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [notification, setNotification] = useState<string | null>(null);

  // Mobile active tab: "editor" or "preview"
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");

  // Publish modal state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initial load
  useEffect(() => {
    let mounted = true;
    async function loadSurvey() {
      try {
        const res = await fetch(`/api/surveys/${id}`);
        if (!res.ok) {
          throw new Error("Failed to load survey");
        }
        const data = await res.json();
        if (mounted) {
          setSurvey(data.survey);
          setTitle(data.survey.title);
          setDescription(data.survey.description || "");
          setQuestions(data.survey.draftSchema?.questions || []);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setLoadError(err.message || "Failed to load");
          setLoading(false);
        }
      }
    }
    loadSurvey();
    return () => {
      mounted = false;
    };
  }, [id]);

  // Schema state object
  const currentSchema: SurveySchema = useMemo(() => ({ questions }), [questions]);

  // Schema validation checks
  const schemaErrors = useMemo(() => {
    return validateSurveySchema(currentSchema, { isPublishing: false });
  }, [currentSchema]);

  // Map of questionId -> error messages
  const errorsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const err of schemaErrors) {
      if (err.questionId) {
        if (!map[err.questionId]) map[err.questionId] = [];
        map[err.questionId].push(err.message);
      }
    }
    return map;
  }, [schemaErrors]);

  const canPublish = useMemo(() => {
    if (!title.trim() || questions.length === 0) return false;
    const pubErrors = validateSurveySchema(currentSchema, {
      isPublishing: true,
      title,
    });
    return pubErrors.length === 0;
  }, [title, questions, currentSchema]);

  // Debounced autosave (~800ms)
  const isInitial = useRef(true);
  useEffect(() => {
    if (loading || !survey) return;

    if (isInitial.current) {
      isInitial.current = false;
      return;
    }

    setSavingStatus("unsaved");
    const timer = setTimeout(async () => {
      setSavingStatus("saving");
      try {
        const res = await fetch(`/api/surveys/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            schema: currentSchema,
          }),
        });
        if (res.ok) {
          setSavingStatus("saved");
        } else {
          setSavingStatus("unsaved");
        }
      } catch {
        setSavingStatus("unsaved");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, description, currentSchema, id, loading, survey]);

  const handlePublish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      // First save draft
      await fetch(`/api/surveys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          schema: currentSchema,
        }),
      });

      // Then publish
      const res = await fetch(`/api/surveys/${id}/publish`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to publish");
      }

      const data = await res.json();
      setPublishedUrl(data.publicUrl);
      setPublishedVersion(data.version);
      setPublishModalOpen(true);

      // Refresh survey data
      if (survey) {
        setSurvey({
          ...survey,
          status: "PUBLISHED",
          latestVersion: data.version,
        });
      }
    } catch (err: any) {
      alert(err.message || "Publishing failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = () => {
    if (!publishedUrl) return;
    navigator.clipboard.writeText(publishedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading survey builder...</span>
        </div>
      </div>
    );
  }

  if (loadError || !survey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <div className="p-6 bg-white rounded-xl border border-red-200 text-center space-y-4 max-w-md">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Error Loading Survey</h2>
          <p className="text-sm text-slate-600">{loadError || "Survey not found"}</p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Top Builder Navigation */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to surveys"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm truncate max-w-[200px] sm:max-w-xs">
              {title || "Untitled Survey"}
            </span>
            {survey.latestVersion > 0 ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
                v{survey.latestVersion} published
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                Draft
              </span>
            )}
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Autosave status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            {savingStatus === "saving" && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Saving...</span>
              </>
            )}
            {savingStatus === "saved" && (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span>Saved</span>
              </>
            )}
            {savingStatus === "unsaved" && (
              <span className="text-amber-500 font-medium">Unsaved changes</span>
            )}
          </div>

          {/* Mobile Tab Toggle */}
          <div className="flex lg:hidden bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setMobileTab("editor")}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1",
                mobileTab === "editor" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
              )}
            >
              <Edit3 className="w-3.5 h-3.5" /> Editor
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={cn(
                "px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1",
                mobileTab === "preview" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
              )}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>

          {/* Publish Button */}
          <button
            type="button"
            disabled={!canPublish || publishing}
            onClick={handlePublish}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title={!canPublish ? "Fix errors or add a question to publish" : "Publish survey"}
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* Notification banner for condition cleanup */}
      {notification && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-amber-900 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Two-Pane Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Editor Pane */}
        <div
          className={cn(
            "w-full lg:w-1/2 flex-1 overflow-y-auto p-4 sm:p-6 lg:border-r border-slate-200 bg-white",
            mobileTab === "preview" ? "hidden lg:block" : "block"
          )}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Survey Meta Card */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Survey Title *
                </label>
                <input
                  type="text"
                  value={title}
                  maxLength={200}
                  placeholder="Enter survey title..."
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-base font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Welcome Note
                </label>
                <textarea
                  rows={2}
                  value={description}
                  maxLength={1000}
                  placeholder="Explain the purpose of this survey..."
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            {/* Questions List */}
            <QuestionList
              questions={questions}
              errorsMap={errorsMap}
              onChange={setQuestions}
              onNotification={setNotification}
            />
          </div>
        </div>

        {/* Right: Preview Pane */}
        <div
          className={cn(
            "w-full lg:w-1/2 h-[calc(100vh-3.5rem)]",
            mobileTab === "editor" ? "hidden lg:block" : "block"
          )}
        >
          <PreviewPane
            title={title}
            description={description}
            schema={currentSchema}
          />
        </div>
      </div>

      {/* Publish Success Modal */}
      {publishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
              <Globe className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Survey Published Successfully!
              </h3>
              <p className="text-xs text-slate-600">
                Version {publishedVersion} is live and ready to collect responses.
              </p>
            </div>

            {publishedUrl && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Public Survey Link:
                </label>
                <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 break-all select-all">
                  <span className="flex-1 truncate">{publishedUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded border border-transparent hover:border-slate-200"
                    title="Copy URL"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
              >
                Continue Editing
              </button>
              {publishedUrl && (
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Form
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
