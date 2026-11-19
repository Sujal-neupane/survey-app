"use client";

import type { RatingDistributionItem } from "@/lib/survey/analytics";
import { Star } from "lucide-react";

interface RatingChartProps {
  label: string;
  answeredCount: number;
  average: number;
  distribution: RatingDistributionItem[];
}

export function RatingChart({
  label,
  answeredCount,
  average,
  distribution,
}: RatingChartProps) {
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

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

      {answeredCount === 0 ? (
        <p className="text-xs text-slate-400 py-4 text-center">
          No responses recorded yet for this question.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center pt-2">
          {/* Big Average Card */}
          <div className="sm:col-span-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
              {average.toFixed(1)}
            </span>
            <div className="flex items-center gap-0.5 text-amber-500 my-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(average)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              out of 5.0 stars
            </span>
          </div>

          {/* 1-5 Distribution bars */}
          <div className="sm:col-span-2 space-y-2">
            {distribution
              .slice()
              .reverse()
              .map((item) => {
                const percentOfAnswers =
                  answeredCount > 0
                    ? Math.round((item.count / answeredCount) * 100)
                    : 0;

                return (
                  <div key={item.value} className="flex items-center gap-2 text-xs">
                    <span className="w-12 font-medium text-slate-600 flex items-center gap-1 font-mono">
                      <span>{item.value}</span>
                      <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                    </span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(item.count > 0 ? 3 : 0, (item.count / maxCount) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="w-16 text-right font-mono text-slate-500">
                      {item.count} ({percentOfAnswers}%)
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
