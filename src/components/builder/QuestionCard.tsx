"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import type { Question, QuestionType, Option } from "@/lib/survey/types";
import { OptionsEditor } from "./OptionsEditor";
import { ConditionEditor } from "./ConditionEditor";
import {
  GripVertical,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: Question;
  index: number;
  totalQuestions: number;
  earlierQuestions: Question[];
  errors?: string[];
  onChange: (updated: Question) => void;
  onDuplicate: (q: Question) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  dragHandleProps?: Record<string, any>;
}

export function QuestionCard({
  question,
  index,
  totalQuestions,
  earlierQuestions,
  errors = [],
  onChange,
  onDuplicate,
  onDelete,
  onMove,
  dragHandleProps,
}: QuestionCardProps) {
  const [showHelp, setShowHelp] = useState(!!question.helpText);

  const handleTypeChange = (newType: QuestionType) => {
    if (newType === question.type) return;

    if (
      (question.type === "single_choice" || question.type === "multi_choice") &&
      question.options.length > 0
    ) {
      if (
        newType !== "single_choice" &&
        newType !== "multi_choice" &&
        !confirm("Changing type will reset custom choices and any conditional rules dependent on this question. Continue?")
      ) {
        return;
      }
    }

    const defaultOptions: Option[] = [
      { id: nanoid(6), label: "Option 1" },
      { id: nanoid(6), label: "Option 2" },
    ];

    switch (newType) {
      case "text":
        onChange({
          id: question.id,
          type: "text",
          label: question.label,
          helpText: question.helpText,
          required: question.required,
          showIf: question.showIf,
          maxLength: 1000,
        });
        break;

      case "single_choice":
        onChange({
          id: question.id,
          type: "single_choice",
          label: question.label,
          helpText: question.helpText,
          required: question.required,
          showIf: question.showIf,
          options:
            question.type === "multi_choice" ? question.options : defaultOptions,
        });
        break;

      case "multi_choice":
        onChange({
          id: question.id,
          type: "multi_choice",
          label: question.label,
          helpText: question.helpText,
          required: question.required,
          showIf: question.showIf,
          options:
            question.type === "single_choice" ? question.options : defaultOptions,
        });
        break;

      case "rating":
        onChange({
          id: question.id,
          type: "rating",
          label: question.label,
          helpText: question.helpText,
          required: question.required,
          showIf: question.showIf,
          min: 1,
          max: 5,
        });
        break;
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border transition-all duration-200 shadow-sm",
        errors.length > 0 ? "border-red-300 ring-1 ring-red-400/20" : "border-slate-200 hover:border-slate-300"
      )}
    >
      {/* Header bar: drag handle, index, badges, actions */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 rounded touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono">
            Q{index + 1}
          </span>
          {question.showIf && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
              <SlidersHorizontal className="w-2.5 h-2.5" /> Conditional
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMove(index, "up")}
            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20"
            title="Move question up"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={index === totalQuestions - 1}
            onClick={() => onMove(index, "down")}
            className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20"
            title="Move question down"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(question)}
            className="p-1 text-slate-400 hover:text-blue-600"
            title="Duplicate question"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={totalQuestions <= 1}
            onClick={() => onDelete(question.id)}
            className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-20"
            title="Delete question"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main card body */}
      <div className="p-4 space-y-3">
        {/* Label and Question Type */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={question.label}
              maxLength={300}
              placeholder="Question label..."
              onChange={(e) => onChange({ ...question, label: e.target.value })}
              className="w-full px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="w-full sm:w-44">
            <select
              value={question.type}
              onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
              className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="text">Text response</option>
              <option value="single_choice">Single choice (radio)</option>
              <option value="multi_choice">Multiple choice (checkbox)</option>
              <option value="rating">Rating (1-5 stars)</option>
            </select>
          </div>
        </div>

        {/* Optional Help Text */}
        {showHelp ? (
          <div>
            <input
              type="text"
              value={question.helpText || ""}
              maxLength={500}
              placeholder="Optional help text / instructions for respondent..."
              onChange={(e) => onChange({ ...question, helpText: e.target.value })}
              className="w-full px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
          >
            <HelpCircle className="w-3 h-3" /> Add description / help text
          </button>
        )}

        {/* Type-specific editor */}
        {question.type === "text" && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
            <span>Max length:</span>
            <input
              type="number"
              min={10}
              max={5000}
              value={question.maxLength ?? 1000}
              onChange={(e) =>
                onChange({
                  ...question,
                  maxLength: Number(e.target.value) || 1000,
                })
              }
              className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
            />
            <span className="text-slate-400">characters</span>
          </div>
        )}

        {(question.type === "single_choice" || question.type === "multi_choice") && (
          <OptionsEditor
            options={question.options}
            onChange={(options) => onChange({ ...question, options })}
          />
        )}

        {question.type === "rating" && (
          <div className="pt-1 text-xs text-slate-500 flex items-center gap-2">
            <span>Scale: 1 to 5 (Fixed)</span>
          </div>
        )}

        {/* Bottom controls: Required toggle & Conditional logic */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => onChange({ ...question, required: e.target.checked })}
              className="rounded text-blue-600 border-slate-300 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Required question</span>
          </label>
        </div>

        {/* Conditional Logic Panel */}
        <ConditionEditor
          currentQuestionId={question.id}
          earlierQuestions={earlierQuestions}
          showIf={question.showIf}
          onChange={(showIf) => onChange({ ...question, showIf })}
        />

        {/* Errors list */}
        {errors.length > 0 && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg space-y-1 text-xs text-red-700">
            {errors.map((err, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
