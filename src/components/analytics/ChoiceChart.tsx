"use client";

import type { ChoiceOptionStat } from "@/lib/survey/analytics";

interface ChoiceChartProps {
  label: string;
  type: "single_choice" | "multi_choice";
  answeredCount: number;
  options: ChoiceOptionStat[];
}

export function ChoiceChart({
  label,
  type,
  answeredCount,
  options,
}: ChoiceChartProps) {
  const maxPercent = Math.max(...options.map((o) => o.percent), 1);

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

      {type === "multi_choice" && (
        <p className="text-[11px] text-slate-400 italic">
          Multiple choice question: respondents may select more than one option.
        </p>
      )}

      {answeredCount === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">
          No responses recorded yet for this question.
        </p>
      ) : (
        <div className="space-y-3 pt-1">
          {options.map((opt) => (
            <div key={opt.id} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-700 truncate max-w-[70%]">
                  {opt.label}
                </span>
                <span className="font-mono text-slate-500">
                  {opt.count} ({opt.percent}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(2, (opt.percent / maxPercent) * 100))}%` }}
                />
              </div>
            </div>
          ))}

          {/* Table summary */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-1.5 font-medium">Option</th>
                  <th className="pb-1.5 font-medium text-right">Responses</th>
                  <th className="pb-1.5 font-medium text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {options.map((opt) => (
                  <tr key={opt.id} className="text-slate-600">
                    <td className="py-1.5 truncate max-w-[200px]">{opt.label}</td>
                    <td className="py-1.5 text-right font-mono">{opt.count}</td>
                    <td className="py-1.5 text-right font-mono font-medium text-slate-800">
                      {opt.percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
