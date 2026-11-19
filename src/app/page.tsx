import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  SlidersHorizontal,
  BarChart3,
  Layers,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navigation header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            SP
          </div>
          <span className="font-bold text-slate-800 text-base tracking-tight">
            Survey Studio
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Admin Sign In
          </Link>
          <Link
            href="/s/customer-feedback-demo"
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Open Live Demo Form
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Full-Stack Dynamic Survey & Analytics Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Create dynamic surveys with{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            instant branching logic
          </span>{" "}
          and real-time analytics.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Build interactive forms with drag-and-drop reordering, four question types,
          authoritative server-side validation, immutable schema versioning, and rich visualizations.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/s/customer-feedback-demo"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <span>Take Demo Survey</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/admin"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <span>Admin Studio</span>
          </Link>
        </div>

        {/* Demo Credentials Box */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs max-w-md mx-auto text-xs text-slate-600 text-left space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Pre-seeded Demo Admin Credentials:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">EMAIL:</span>
              <span className="text-slate-800 font-medium">demo@example.com</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">PASSWORD:</span>
              <span className="text-slate-800 font-medium">Demo@12345</span>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 text-left">
          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Cascade Conditional Logic
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Rules only reference earlier non-text questions, eliminating cycles. Hidden answers are stripped automatically.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Immutable Versioning
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Publishing creates frozen schema snapshots. Editing drafts never alters or corrupts historical responses.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-2 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Real-time Analytics
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Immediate per-question statistics, choice distributions, rating averages, recent text responses, and CSV export.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        Dynamic Survey Platform — Built with Next.js 16, TypeScript, Tailwind CSS & PostgreSQL
      </footer>
    </div>
  );
}
