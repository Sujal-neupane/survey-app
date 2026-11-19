"use client";

import type { Question } from "@/lib/survey/types";
import { RatingInput } from "./RatingInput";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionFieldProps {
  question: Question;
  value: unknown;
  error?: string;
  onChange: (val: string | number | string[]) => void;
  disabled?: boolean;
}

export function QuestionField({
  question,
  value,
  error,
  onChange,
  disabled = false,
}: QuestionFieldProps) {
  const fieldId = `q-${question.id}`;
  const errorId = `error-${question.id}`;
  const helpId = `help-${question.id}`;

  const renderInput = () => {
    switch (question.type) {
      case "text": {
        const textVal = typeof value === "string" ? value : "";
        const maxLen = question.maxLength ?? 1000;
        return (
          <div className="space-y-1">
            <textarea
              id={fieldId}
              rows={3}
              value={textVal}
              maxLength={maxLen}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Type your response here..."
              aria-invalid={!!error}
              aria-describedby={error ? errorId : question.helpText ? helpId : undefined}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 placeholder:text-slate-400",
                error
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20",
                disabled && "bg-slate-50 cursor-not-allowed opacity-60"
              )}
            />
            <div className="flex justify-end text-xs text-slate-400">
              {textVal.length} / {maxLen}
            </div>
          </div>
        );
      }

      case "single_choice": {
        const currentVal = typeof value === "string" ? value : "";
        return (
          <div
            role="radiogroup"
            id={fieldId}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : question.helpText ? helpId : undefined}
            className="space-y-2 pt-1"
          >
            {question.options.map((opt) => {
              const isChecked = currentVal === opt.id;
              return (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 select-none text-sm",
                    isChecked
                      ? "bg-blue-50/70 border-blue-400 text-blue-900 font-medium ring-1 ring-blue-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <input
                    type="radio"
                    name={fieldId}
                    value={opt.id}
                    checked={isChecked}
                    disabled={disabled}
                    onChange={() => onChange(opt.id)}
                    className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case "multi_choice": {
        const currentArr: string[] = Array.isArray(value) ? value : [];

        const toggleOption = (optId: string) => {
          if (disabled) return;
          if (currentArr.includes(optId)) {
            onChange(currentArr.filter((id) => id !== optId));
          } else {
            onChange([...currentArr, optId]);
          }
        };

        return (
          <div
            role="group"
            id={fieldId}
            aria-describedby={error ? errorId : question.helpText ? helpId : undefined}
            className="space-y-2 pt-1"
          >
            {question.options.map((opt) => {
              const isChecked = currentArr.includes(opt.id);
              return (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-150 select-none text-sm",
                    isChecked
                      ? "bg-blue-50/70 border-blue-400 text-blue-900 font-medium ring-1 ring-blue-500/20"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
                    disabled && "cursor-not-allowed opacity-60"
                  )}
                >
                  <input
                    type="checkbox"
                    value={opt.id}
                    checked={isChecked}
                    disabled={disabled}
                    onChange={() => toggleOption(opt.id)}
                    className="h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        );
      }

      case "rating": {
        const numVal = typeof value === "number" ? value : undefined;
        return (
          <RatingInput
            id={fieldId}
            value={numVal}
            min={question.min ?? 1}
            max={question.max ?? 5}
            disabled={disabled}
            onChange={(val) => onChange(val)}
          />
        );
      }
    }
  };

  return (
    <div
      id={`container-${question.id}`}
      className={cn(
        "p-5 rounded-xl border bg-white shadow-sm transition-all duration-200",
        error ? "border-red-300 ring-1 ring-red-400/20" : "border-slate-200"
      )}
    >
      <div className="mb-3">
        <label
          htmlFor={fieldId}
          className="block text-base font-semibold text-slate-800"
        >
          {question.label || "Untitled Question"}
          {question.required && (
            <span className="text-red-500 ml-1" title="Required">
              *
            </span>
          )}
        </label>
        {question.helpText && (
          <p id={helpId} className="text-xs text-slate-500 mt-1">
            {question.helpText}
          </p>
        )}
      </div>

      {renderInput()}

      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-red-600"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
