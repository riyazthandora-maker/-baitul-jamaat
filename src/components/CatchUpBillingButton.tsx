"use client";

import { useState } from "react";
import { RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CatchUpResult {
  period: string;
  created: number;
  skipped: number;
  errors: string[];
}

interface Props {
  programId: string;
}

export default function CatchUpBillingButton({ programId }: Props) {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<{
    missed_dates: string[];
    enrollment_count: number;
    recurrence: string;
  } | null>(null);
  const [results, setResults] = useState<CatchUpResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setPreview(null);
    setResults(null);
    const res = await fetch(`/api/admin/programs/${programId}/catchup`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setError(data.error ?? "Failed to check missed periods");
    else if (data.missed_dates.length === 0) setError("No missed billing periods found.");
    else setPreview(data);
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    const res = await fetch(`/api/admin/programs/${programId}/catchup`, { method: "POST" });
    const data = await res.json();
    setRunning(false);
    setPreview(null);
    if (!res.ok) setError(data.error ?? "Catch-up billing failed");
    else setResults(data.results);
  }

  function formatDate(iso: string, recurrence: string) {
    if (recurrence === "yearly") return new Date(iso + "T00:00:00").getFullYear().toString();
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }

  const totalCreated = results?.reduce((s, r) => s + r.created, 0) ?? 0;
  const totalSkipped = results?.reduce((s, r) => s + r.skipped, 0) ?? 0;

  return (
    <div className="space-y-3">
      {!preview && !results && (
        <button
          onClick={handleCheck}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg hover:bg-amber-100 disabled:opacity-60 transition-colors font-medium"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Catch Up Missed Billing</>
          )}
        </button>
      )}

      {preview && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1.5">
              <p className="font-semibold text-amber-800">
                {preview.missed_dates.length} missed{" "}
                {preview.recurrence === "yearly" ? "year" : "month"}
                {preview.missed_dates.length !== 1 ? "s" : ""} detected
              </p>
              <ul className="text-amber-700 space-y-0.5">
                {preview.missed_dates.map((d) => (
                  <li key={d} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    {formatDate(d, preview.recurrence)}
                    <span className="text-amber-500 text-xs">
                      — {preview.enrollment_count} member{preview.enrollment_count !== 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-amber-700 font-medium pt-1">
                Total: up to{" "}
                {preview.missed_dates.length * preview.enrollment_count} charges
                {" "}(already-billed periods will be skipped automatically)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition-colors"
            >
              {running ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
              ) : (
                "Confirm & Catch Up"
              )}
            </button>
            <button
              onClick={() => setPreview(null)}
              disabled={running}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {results && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <p className="font-semibold text-sm">
              Catch-up complete — {totalCreated} charge{totalCreated !== 1 ? "s" : ""} created
              {totalSkipped > 0 && `, ${totalSkipped} skipped`}
            </p>
          </div>
          <div className="space-y-1">
            {results.map((r) => (
              <div key={r.period} className="flex items-center justify-between text-xs text-green-700">
                <span className="font-medium">{r.period}</span>
                <span>
                  {r.created} created{r.skipped > 0 && `, ${r.skipped} skipped`}
                  {r.errors.length > 0 && (
                    <span className="text-red-600 ml-1">({r.errors.length} error{r.errors.length !== 1 ? "s" : ""})</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
