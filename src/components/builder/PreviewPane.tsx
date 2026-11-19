"use client";

import { useState } from "react";
import type { SurveySchema } from "@/lib/survey/types";
import { SurveyRenderer } from "../survey/SurveyRenderer";
import { Smartphone, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewPaneProps {
  title: string;
  description?: string;
  schema: SurveySchema;
}

export function PreviewPane({ title, description, schema }: PreviewPaneProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className="h-full flex flex-col bg-slate-100/70 border-l border-slate-200">
      {/* Top bar */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
          Live Interactive Preview
        </span>
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={cn(
              "p-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
              device === "desktop"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
            title="Desktop view"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={cn(
              "p-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1",
              device === "mobile"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            )}
            title="Mobile view (375px)"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview content scrollable */}
      <div className="flex-1 overflow-y-auto p-4 flex justify-center items-start">
        <div
          className={cn(
            "w-full bg-white rounded-2xl shadow-sm border border-slate-200 transition-all duration-300 overflow-hidden",
            device === "mobile" ? "max-w-[375px] min-h-[667px] my-4" : "max-w-2xl my-2"
          )}
        >
          <SurveyRenderer
            title={title}
            description={description}
            schema={schema}
            isPreview={true}
          />
        </div>
      </div>
    </div>
  );
}
