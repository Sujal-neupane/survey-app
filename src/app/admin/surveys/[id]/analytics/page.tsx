"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Users,
  Clock,
  BarChart2,
  List,
  Edit3,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import type { AnalyticsResult } from "@/lib/survey/analytics";
import { StatCard } from "@/components/analytics/StatCard";
import { ChoiceChart } from "@/components/analytics/ChoiceChart";
import { RatingChart } from "@/components/analytics/RatingChart";
import { TextList } from "@/components/analytics/TextList";

export default function AnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [versions, setVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("all");
  const [lastResponseAt, setLastResponseAt] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchAnalytics = async (ver: string) => {
    setLoading(true);
    try {
      const q = ver === "all" ? "all" : ver;
      const res = await fetch(`/api/surveys/${id}/analytics?version=${q}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
        setVersions(data.versions || []);
        setLastResponseAt(data.lastResponseAt);
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedVersion);
  }, [id, selectedVersion]);

  // Export CSV function
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/surveys/${id}/responses?limit=1000&version=${selectedVersion}`);
      if (!res.ok) throw new Error("Failed to export responses");
      const data = await res.json();

      const responses = data.responses || [];
      if (responses.length === 0) {
        alert("No responses available to export.");
        return;
      }

      // Collect all question labels as headers
      const headerSet = new Set<string>();
      for (const r of responses) {
        for (const a of r.answers) {
          headerSet.add(a.label);
        }
      }
      const headers = ["Response ID", "Version", "Submitted At", ...Array.from(headerSet)];

      const csvRows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",")];

      for (const r of responses) {
        const answerMap = new Map(r.answers.map((a: any) => [a.label, a.displayValue]));
        const row = [
          r.id,
          `v${r.version}`,
          new Date(r.submittedAt).toLocaleString(),
          ...Array.from(headerSet).map((h) => answerMap.get(h) || ""),
        ];
        csvRows.push(row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","));
      }

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `survey_responses_${selectedVersion}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Back to surveys"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-slate-300">|</span>
          <span className="font-bold text-slate-800 text-sm">
            Survey Analytics
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/surveys/${id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Builder</span>
          </Link>

          <Link
            href={`/admin/surveys/${id}/responses`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <List className="w-3.5 h-3.5" />
            <span>Responses</span>
          </Link>

          <button
            type="button"
            disabled={exporting || !analytics || analytics.totalResponses === 0}
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Controls Bar: Version Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Performance Insights
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Summary and question-by-question breakdown of completed submissions.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-medium text-slate-500">Version:</span>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Versions Combined</option>
              {versions.map((ver) => (
                <option key={ver} value={String(ver)}>
                  Version {ver}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Loading analytics...</span>
          </div>
        ) : !analytics || analytics.totalResponses === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <BarChart2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No responses recorded yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once respondents submit your published survey, total counts, charts, distributions, and insights will display here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                title="Total Completed Responses"
                value={analytics.totalResponses}
                subtitle={`Filtering: ${selectedVersion === "all" ? "All versions" : `Version ${selectedVersion}`}`}
                icon={<Users className="w-5 h-5" />}
              />
              <StatCard
                title="Last Response Received"
                value={
                  lastResponseAt
                    ? new Date(lastResponseAt).toLocaleDateString()
                    : "None"
                }
                subtitle={
                  lastResponseAt
                    ? new Date(lastResponseAt).toLocaleTimeString()
                    : undefined
                }
                icon={<Clock className="w-5 h-5" />}
              />
            </div>

            {/* Questions Analytics List */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Question Insights ({analytics.questions.length})
              </h3>

              {analytics.questions.map((q) => {
                if (q.type === "single_choice" || q.type === "multi_choice") {
                  return (
                    <ChoiceChart
                      key={q.questionId}
                      label={q.label}
                      type={q.type}
                      answeredCount={q.answeredCount}
                      options={q.options}
                    />
                  );
                }
                if (q.type === "rating") {
                  return (
                    <RatingChart
                      key={q.questionId}
                      label={q.label}
                      answeredCount={q.answeredCount}
                      average={q.average}
                      distribution={q.distribution}
                    />
                  );
                }
                if (q.type === "text") {
                  return (
                    <TextList
                      key={q.questionId}
                      label={q.label}
                      answeredCount={q.answeredCount}
                      recent={q.recent}
                      hasMore={q.hasMore}
                      surveyId={id}
                    />
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
