"use client";

import { useState } from "react";
import { PlayCircle, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  programId: string;
  recurrence: string;
}

export default function RunBillingForm({ programId, recurrence }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const isOnDemand = recurrence === "on_demand";

  const [date, setDate] = useState(today);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{ would_create: number; would_skip: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[]; billedFor: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    setPreviewing(true);
    setError(null);
    setPreview(null);
    const res = await fetch(`/api/admin/programs/${programId}/bill`);
    const data = await res.json();
    setPreviewing(false);
    if (!res.ok) setError(data.error ?? "Failed to fetch preview");
    else setPreview(data);
  }

  async function handleRun(billingDate: string) {
    setRunning(true);
    setError(null);
    setResult(null);
    const res = await fetch(`/api/admin/programs/${programId}/bill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: billingDate }),
    });
    const data = await res.json();
    setRunning(false);
    setPreview(null);
    if (!res.ok) setError(data.error ?? "Billing failed");
    else setResult(data);
  }

  if (isOnDemand) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-brand-green" />
          Run Billing
        </h2>

        {!preview ? (
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
          >
            {previewing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
            ) : (
              <><PlayCircle className="w-4 h-4" /> Run Now</>
            )}
          </button>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">Confirm Billing Run</p>
                <p className="text-amber-700 mt-1">
                  This will create{" "}
                  <span className="font-bold">
                    {preview.would_create} new charge{preview.would_create !== 1 ? "s" : ""}
                  </span>.
                  {preview.would_skip > 0 &&
                    ` ${preview.would_skip} member${preview.would_skip !== 1 ? "s" : ""} already billed today will be skipped.`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRun(today)}
                disabled={running}
                className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
              >
                {running ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
                ) : (
                  "Confirm & Run"
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

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {result && (
          <div className="text-sm bg-green-50 rounded-lg px-4 py-3 space-y-1">
            <p className="font-medium text-green-700">Billing run complete</p>
            <p className="text-green-600">
              {result.created} charge{result.created !== 1 ? "s" : ""} created
              {result.skipped > 0 && `, ${result.skipped} already billed today (skipped)`}
            </p>
            {result.errors.length > 0 && (
              <ul className="text-red-600 list-disc list-inside">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  // Monthly / yearly: keep date-picker flow
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
      <h2 className="font-semibold text-gray-700 flex items-center gap-2">
        <PlayCircle className="w-4 h-4 text-brand-green" />
        Run Billing
      </h2>

      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Billing Date</label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
          />
        </div>
        <button
          onClick={() => handleRun(date)}
          disabled={running}
          className="flex items-center gap-2 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark disabled:opacity-60 transition-colors"
        >
          {running ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
          ) : (
            <><PlayCircle className="w-4 h-4" /> Run Billing</>
          )}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {result && (
        <div className="text-sm bg-green-50 rounded-lg px-4 py-3 space-y-1">
          <p className="font-medium text-green-700">
            Billing run for {new Date(result.billedFor + "T00:00:00").toLocaleDateString("en-IN")}
          </p>
          <p className="text-green-600">
            {result.created} charge{result.created !== 1 ? "s" : ""} created
            {result.skipped > 0 && `, ${result.skipped} already billed (skipped)`}
          </p>
          {result.errors.length > 0 && (
            <ul className="text-red-600 list-disc list-inside">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
