"use client";

import { useState } from "react";
import { PlayCircle, Loader2 } from "lucide-react";

export default function RunBillingForm({ programId }: { programId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    errors: string[];
    billedFor: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    setResult(null);

    const res = await fetch(`/api/admin/programs/${programId}/bill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });

    const data = await res.json();
    setRunning(false);

    if (!res.ok) {
      setError(data.error ?? "Billing failed");
    } else {
      setResult(data);
    }
  }

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
          onClick={handleRun}
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
