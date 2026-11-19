"use client";

import type { Condition, ConditionGroup, Question } from "@/lib/survey/types";
import { Plus, Trash2, SlidersHorizontal } from "lucide-react";

interface ConditionEditorProps {
  currentQuestionId: string;
  earlierQuestions: Question[]; // Only questions that appear strictly EARLIER in the array
  showIf?: ConditionGroup;
  onChange: (showIf: ConditionGroup | undefined) => void;
}

export function ConditionEditor({
  earlierQuestions,
  showIf,
  onChange,
}: ConditionEditorProps) {
  // Only earlier non-text questions can be condition sources!
  const eligibleSources = earlierQuestions.filter((q) => q.type !== "text");

  if (eligibleSources.length === 0) {
    return (
      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
        Conditional logic requires at least one earlier choice or rating question above this one.
      </div>
    );
  }

  const handleEnableLogic = () => {
    const firstSource = eligibleSources[0];
    let defaultOp: Condition["operator"] = "equals";
    let defaultVal: string | number = "";

    if (firstSource.type === "single_choice") {
      defaultOp = "equals";
      defaultVal = firstSource.options[0]?.id || "";
    } else if (firstSource.type === "multi_choice") {
      defaultOp = "includes";
      defaultVal = firstSource.options[0]?.id || "";
    } else if (firstSource.type === "rating") {
      defaultOp = "equals";
      defaultVal = 5;
    }

    onChange({
      logic: "and",
      conditions: [
        {
          questionId: firstSource.id,
          operator: defaultOp,
          value: defaultVal,
        },
      ],
    });
  };

  const handleDisableLogic = () => {
    onChange(undefined);
  };

  const handleAddCondition = () => {
    if (!showIf || showIf.conditions.length >= 5) return;
    const firstSource = eligibleSources[0];
    let defaultOp: Condition["operator"] = "equals";
    let defaultVal: string | number = "";

    if (firstSource.type === "single_choice") {
      defaultOp = "equals";
      defaultVal = firstSource.options[0]?.id || "";
    } else if (firstSource.type === "multi_choice") {
      defaultOp = "includes";
      defaultVal = firstSource.options[0]?.id || "";
    } else if (firstSource.type === "rating") {
      defaultOp = "equals";
      defaultVal = 5;
    }

    onChange({
      ...showIf,
      conditions: [
        ...showIf.conditions,
        {
          questionId: firstSource.id,
          operator: defaultOp,
          value: defaultVal,
        },
      ],
    });
  };

  const handleUpdateCondition = (index: number, updated: Condition) => {
    if (!showIf) return;
    const next = [...showIf.conditions];
    next[index] = updated;
    onChange({ ...showIf, conditions: next });
  };

  const handleRemoveCondition = (index: number) => {
    if (!showIf) return;
    const next = showIf.conditions.filter((_, i) => i !== index);
    if (next.length === 0) {
      onChange(undefined);
    } else {
      onChange({ ...showIf, conditions: next });
    }
  };

  const handleLogicToggle = (logic: "and" | "or") => {
    if (!showIf) return;
    onChange({ ...showIf, logic });
  };

  if (!showIf) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={handleEnableLogic}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-medium py-1"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Add conditional visibility rule
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
          Show this question only when:
        </span>
        <button
          type="button"
          onClick={handleDisableLogic}
          className="text-xs text-red-600 hover:underline"
        >
          Remove rule
        </button>
      </div>

      {showIf.conditions.length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Match:</span>
          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => handleLogicToggle("and")}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                showIf.logic === "and"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ALL (AND)
            </button>
            <button
              type="button"
              onClick={() => handleLogicToggle("or")}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                showIf.logic === "or"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ANY (OR)
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {showIf.conditions.map((cond, idx) => {
          const source = eligibleSources.find((q) => q.id === cond.questionId) || eligibleSources[0];

          const handleSourceChange = (newSourceId: string) => {
            const newSource = eligibleSources.find((q) => q.id === newSourceId);
            if (!newSource) return;

            if (newSource.type === "single_choice") {
              handleUpdateCondition(idx, {
                questionId: newSource.id,
                operator: "equals",
                value: newSource.options[0]?.id || "",
              });
            } else if (newSource.type === "multi_choice") {
              handleUpdateCondition(idx, {
                questionId: newSource.id,
                operator: "includes",
                value: newSource.options[0]?.id || "",
              });
            } else if (newSource.type === "rating") {
              handleUpdateCondition(idx, {
                questionId: newSource.id,
                operator: "equals",
                value: 5,
              });
            }
          };

          return (
            <div key={idx} className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-md border border-slate-200 text-xs">
              {/* Source Question Select */}
              <select
                value={cond.questionId}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 bg-white max-w-[180px] truncate"
              >
                {eligibleSources.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.label || "Untitled Question"}
                  </option>
                ))}
              </select>

              {/* Operator Select based on source type */}
              {source.type === "single_choice" && (
                <select
                  value={cond.operator}
                  onChange={(e) =>
                    handleUpdateCondition(idx, {
                      ...cond,
                      operator: e.target.value as "equals" | "not_equals",
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 bg-white"
                >
                  <option value="equals">is equal to</option>
                  <option value="not_equals">is not equal to</option>
                </select>
              )}

              {source.type === "multi_choice" && (
                <select
                  value={cond.operator}
                  onChange={(e) =>
                    handleUpdateCondition(idx, {
                      ...cond,
                      operator: e.target.value as "includes",
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 bg-white"
                >
                  <option value="includes">includes</option>
                </select>
              )}

              {source.type === "rating" && (
                <select
                  value={cond.operator}
                  onChange={(e) =>
                    handleUpdateCondition(idx, {
                      ...cond,
                      operator: e.target.value as "equals" | "gt" | "lt",
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 bg-white"
                >
                  <option value="equals">equals</option>
                  <option value="gt">is greater than</option>
                  <option value="lt">is less than</option>
                </select>
              )}

              {/* Value Selector */}
              {(source.type === "single_choice" || source.type === "multi_choice") && (
                <select
                  value={String(cond.value)}
                  onChange={(e) =>
                    handleUpdateCondition(idx, {
                      ...cond,
                      value: e.target.value,
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 bg-white max-w-[150px] truncate"
                >
                  {source.options.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label || "Option"}
                    </option>
                  ))}
                </select>
              )}

              {source.type === "rating" && (
                <select
                  value={Number(cond.value)}
                  onChange={(e) =>
                    handleUpdateCondition(idx, {
                      ...cond,
                      value: Number(e.target.value),
                    })
                  }
                  className="px-2 py-1 rounded border border-slate-300 bg-white"
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => handleRemoveCondition(idx)}
                className="ml-auto p-1 text-slate-400 hover:text-red-500"
                title="Remove condition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {showIf.conditions.length < 5 && (
        <button
          type="button"
          onClick={handleAddCondition}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Add another condition
        </button>
      )}
    </div>
  );
}
