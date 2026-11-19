"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  List,
  Edit3,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Calendar,
} from "lucide-react";

interface AnswerItem {
  questionId: string;
  label: string;
  type: string;
  value: any;
  displayValue: string;
}

interface ResponseRecord {
  id: string;
  version: number;
  submittedAt: string;
  answers: AnswerItem[];
}

export default function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<ResponseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [versions, setVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const fetchResponses = async (p = 1, ver = selectedVersion) => {
    setLoading(true);
    try {
      const v = ver === "all" ? "all" : ver;
      const res = await fetch(`/api/surveys/${id}/responses?page=${p}&limit=15&version=${v}`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data.responses || []);
        setTotal(data.pagination?.total || 0);
        setPage(data.pagination?.page || 1);
        setTotalPages(data.pagination?.totalPages || 1);
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error("Failed to load responses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses(1, selectedVersion);
  }, [id, selectedVersion]);

  // Handle Export CSV
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/surveys/${id}/responses?limit=1000&version=${selectedVersion}`);
      if (!res.ok) throw new Error("Failed to export responses");
      const data = await res.json();

      const allResponses: ResponseRecord[] = data.responses || [];
      if (allResponses.length === 0) {
        alert("No responses to export.");
        return;
      }

      const headerSet = new Set<string>();
      for (const r of allResponses) {
        for (const a of r.answers) {
          headerSet.add(a.label);
        }
      }
      const headers = ["Response ID", "Version", "Submitted At", ...Array.from(headerSet)];

      const csvRows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",")];

      for (const r of allResponses) {
        const answerMap = new Map(r.answers.map((a) => [a.label, a.displayValue]));
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
            Survey Submissions
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
            href={`/admin/surveys/${id}/analytics`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </Link>

          <button
            type="button"
            disabled={exporting || total === 0}
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

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Individual Responses
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Browsing {total} completed submissions with human-readable answers.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-medium text-slate-500">Version:</span>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Versions</option>
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
            <span>Loading submissions...</span>
          </div>
        ) : responses.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <List className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              No submissions found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no completed responses matching the selected version filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {responses.map((resp) => (
                <div key={resp.id} className="p-5 space-y-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full font-mono font-medium bg-slate-100 text-slate-700 text-[10px]">
                        v{resp.version}
                      </span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        ID: {resp.id.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(resp.submittedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {resp.answers.map((ans, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50/70 border border-slate-100 rounded-lg space-y-1"
                      >
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                          {ans.label}
                        </span>
                        <div className="text-xs font-medium text-slate-800">
                          {ans.displayValue || <span className="text-slate-400 italic">No answer</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 pt-2">
                <span className="text-xs text-slate-500 font-mono">
                  Page {page} of {totalPages}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => fetchResponses(page - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => fetchResponses(page + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
