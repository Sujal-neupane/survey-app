"use client";

import { nanoid } from "nanoid";
import type { Option } from "@/lib/survey/types";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface OptionsEditorProps {
  options: Option[];
  onChange: (options: Option[]) => void;
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const handleAdd = () => {
    if (options.length >= 20) return;
    const newOption: Option = {
      id: nanoid(6),
      label: `Option ${options.length + 1}`,
    };
    onChange([...options, newOption]);
  };

  const handleUpdate = (id: string, label: string) => {
    onChange(options.map((opt) => (opt.id === id ? { ...opt, label } : opt)));
  };

  const handleRemove = (id: string) => {
    if (options.length <= 2) return;
    onChange(options.filter((opt) => opt.id !== id));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= options.length) return;

    const copy = [...options];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    onChange(copy);
  };

  return (
    <div className="space-y-2 mt-3">
      <div className="flex justify-between items-center text-xs font-medium text-slate-600">
        <span>Answer Choices ({options.length}/20)</span>
        {options.length < 2 && (
          <span className="text-red-500 font-normal">Minimum 2 choices required</span>
        )}
      </div>

      <div className="space-y-2">
        {options.map((opt, idx) => (
          <div key={opt.id} className="flex items-center gap-2">
            <span className="w-5 text-xs text-slate-400 font-mono text-center">
              {idx + 1}.
            </span>
            <input
              type="text"
              value={opt.label}
              maxLength={200}
              onChange={(e) => handleUpdate(opt.id, e.target.value)}
              placeholder={`Choice ${idx + 1}`}
              className="flex-1 px-2.5 py-1.5 text-xs rounded-md border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => handleMove(idx, "up")}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors"
                title="Move up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === options.length - 1}
                onClick={() => handleMove(idx, "down")}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 transition-colors"
                title="Move down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={options.length <= 2}
                onClick={() => handleRemove(opt.id)}
                className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-20 transition-colors"
                title={options.length <= 2 ? "Minimum 2 choices required" : "Delete choice"}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {options.length < 20 && (
        <button
          type="button"
          onClick={handleAdd}
          className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 py-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add choice
        </button>
      )}
    </div>
  );
}
