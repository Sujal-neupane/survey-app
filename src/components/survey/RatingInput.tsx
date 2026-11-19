"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingInputProps {
  id: string;
  value?: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export function RatingInput({
  id,
  value,
  min = 1,
  max = 5,
  onChange,
  disabled = false,
}: RatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div
      role="radiogroup"
      aria-label="Rating scale"
      id={id}
      className="flex flex-wrap items-center gap-2 pt-1"
    >
      {options.map((num) => {
        const isSelected = value === num;
        const isHovered = hoverValue !== null && hoverValue >= num;

        return (
          <button
            key={num}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Rate ${num} out of ${max}`}
            disabled={disabled}
            onClick={() => onChange(num)}
            onMouseEnter={() => setHoverValue(num)}
            onMouseLeave={() => setHoverValue(null)}
            className={cn(
              "flex flex-col items-center justify-center w-12 h-12 rounded-xl border text-sm font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
              isSelected
                ? "bg-blue-600 border-blue-600 text-white shadow-sm ring-2 ring-blue-500/20"
                : isHovered
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Star
              className={cn(
                "w-4 h-4 mb-0.5",
                isSelected
                  ? "fill-white text-white"
                  : isHovered
                  ? "fill-blue-400 text-blue-400"
                  : "text-slate-400"
              )}
            />
            <span className="text-xs leading-none">{num}</span>
          </button>
        );
      })}
    </div>
  );
}
