"use client";

import Link from "next/link";
import type { TextRecentItem } from "@/lib/survey/analytics";
import { MessageSquare, ArrowRight } from "lucide-react";

interface TextListProps {
  label: string;
  answeredCount: number;
  recent: TextRecentItem[];
  hasMore: boolean;
  surveyId: string;
}

export function TextList({
  label,
  answeredCount,
  recent,
  hasMore,
  surveyId,
}: TextListProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h4 className="font-semibold text-slate-800 text-sm">
          {label}
        </h4>
        <span className="text-xs text-slate-500 font-mono">
          {answeredCount} answered
        </span>
      </div>

      {recent.length === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">
          No text responses recorded yet for this question.
        </p>
      ) : (
        <div className="space-y-2.5">
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recent.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/70 border border-slate-100 rounded-lg text-xs space-y-1.5"
              >
                <p className="text-slate-800 font-normal leading-relaxed whitespace-pre-wrap">
                  "{item.text}"
                </p>
                <div className="text-[10px] text-slate-400 font-mono">
                  {new Date(item.submittedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-100">
            <span className="text-slate-400">
              Showing {recent.length} of {answeredCount} responses
            </span>
            <Link
              href={`/admin/surveys/${surveyId}/responses`}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              <span>View all responses</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
