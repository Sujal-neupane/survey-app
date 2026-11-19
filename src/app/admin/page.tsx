"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  BarChart2,
  Edit3,
  Copy,
  Trash2,
  Lock,
  Globe,
  Check,
  LogOut,
  FolderOpen,
  Loader2,
  X,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface SurveyItem {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  slug: string;
  responseCount: number;
  latestVersion: number;
  updatedAt: string;
  createdAt: string;
}

export default function AdminSurveysPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState("");
  const [newSurveyDescription, setNewSurveyDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, surveysRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/surveys"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setUserEmail(meData.email);
        }

        if (surveysRes.ok) {
          const surveysData = await surveysRes.json();
          setSurveys(surveysData.surveys || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const openCreateModal = () => {
    setNewSurveyTitle("");
    setNewSurveyDescription("");
    setCreateError(null);
    setCreateModalOpen(true);
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = newSurveyTitle.trim();
    if (!trimmedTitle) {
      setCreateError("Enter a survey title to continue.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          description: newSurveyDescription.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create survey");
      const data = await res.json();
      router.push(`/admin/surveys/${data.survey.id}/edit`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Failed to create survey");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? All responses and versions will be permanently removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/surveys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSurveys((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      alert("Failed to delete survey");
    }
  };

  const handleClose = async (id: string) => {
    if (!confirm("Closing this survey will stop accepting new responses. Continue?")) {
      return;
    }

    try {
      const res = await fetch(`/api/surveys/${id}/close`, { method: "POST" });
      if (res.ok) {
        setSurveys((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: "CLOSED" } : s))
        );
      }
    } catch {
      alert("Failed to close survey");
    }
  };

  const handleCopyLink = (slug: string, id: string) => {
    const origin = window.location.origin;
    const url = `${origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            SP
          </div>
          <span className="font-bold text-slate-800 text-base tracking-tight">
            Survey Studio
          </span>
        </div>

        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              {userEmail}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Surveys
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create, publish, and monitor real-time survey responses and analytics.
            </p>
          </div>

          <button
            type="button"
            disabled={creating}
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>New Survey</span>
          </button>
        </div>

        {/* Surveys List / Empty State */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Loading your surveys...</span>
          </div>
        ) : surveys.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <FolderOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                No surveys created yet
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Get started by creating your first dynamic survey with customizable question types and conditional logic.
              </p>
            </div>
            <button
              type="button"
              disabled={creating}
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Survey</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between p-5 space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {survey.status === "PUBLISHED" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                        <Globe className="w-3 h-3" /> Live (v{survey.latestVersion})
                      </span>
                    ) : survey.status === "CLOSED" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        <Lock className="w-3 h-3" /> Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Draft
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(survey.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-semibold text-slate-900 text-base line-clamp-1">
                    {survey.title || "Untitled Survey"}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                    {survey.description || "No description provided."}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Total Responses:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {survey.responseCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <Link
                      href={`/admin/surveys/${survey.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                      title="Edit questions and logic"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>

                    <Link
                      href={`/admin/surveys/${survey.id}/analytics`}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium border border-blue-200 transition-colors"
                      title="View responses analytics"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>Analytics</span>
                    </Link>

                    {survey.status === "PUBLISHED" && (
                      <button
                        type="button"
                        onClick={() => handleCopyLink(survey.slug, survey.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-slate-50"
                        title="Copy public link"
                      >
                        {copiedId === survey.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {survey.status === "PUBLISHED" && (
                      <button
                        type="button"
                        onClick={() => handleClose(survey.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-slate-50"
                        title="Close survey"
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(survey.id, survey.title)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-slate-50"
                      title="Delete survey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-survey-title"
        >
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                  New workspace
                </p>
                <h2 id="create-survey-title" className="mt-1 text-xl font-bold text-slate-950">
                  Start with a survey title
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Give your survey a name before opening the builder. You can add questions and
                  branching logic next.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close create survey dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="new-survey-title" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Survey title <span className="text-red-600">*</span>
                </label>
                <input
                  id="new-survey-title"
                  autoFocus
                  required
                  maxLength={200}
                  value={newSurveyTitle}
                  onChange={(event) => setNewSurveyTitle(event.target.value)}
                  placeholder="e.g. Q4 customer feedback"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                />
              </div>
              <div>
                <label htmlFor="new-survey-description" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Welcome note <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="new-survey-description"
                  rows={3}
                  maxLength={1000}
                  value={newSurveyDescription}
                  onChange={(event) => setNewSurveyDescription(event.target.value)}
                  placeholder="Tell respondents why you are collecting feedback."
                  className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
                />
              </div>
            </div>

            {createError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {createError}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue to builder
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
