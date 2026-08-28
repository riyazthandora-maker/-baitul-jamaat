"use client";

import { useState, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
import { Upload, Download, CheckCircle, XCircle, ArrowLeft, Users } from "lucide-react";
import type { ValidatedRow, ImportRow } from "@/lib/csv-import";

type Step = 1 | 2 | 3;

interface PreviewResult {
  total: number;
  valid: number;
  errors: number;
  rows: ValidatedRow[];
}

interface CommitResult {
  succeeded: number;
  failed: number;
  results: Array<{
    phone: string;
    full_name: string;
    member_number?: string;
    error?: string;
  }>;
}

const STATUS_BADGE: Record<ValidatedRow["status"], string> = {
  valid: "bg-green-100 text-green-800 border border-green-200",
  error: "bg-red-100 text-red-800 border border-red-200",
};

const STATUS_LABEL: Record<ValidatedRow["status"], string> = {
  valid: "Valid",
  error: "Error",
};

export default function BulkImportPage() {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (rowNum: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  const handleFileChange = useCallback(async (file: File) => {
    if (!file) return;
    setError(null);
    setLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/admin/members/import", {
        method: "POST",
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to parse file");
        setLoading(false);
        return;
      }

      setPreview(data);
      setStep(2);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCommit = async () => {
    if (!preview) return;

    const validRows: ImportRow[] = preview.rows
      .filter((r) => r.status === "valid")
      .map((r) => r.data);

    if (validRows.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/members/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validRows }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
        setLoading(false);
        return;
      }

      setCommitResult(data);
      setStep(3);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setPreview(null);
    setCommitResult(null);
    setError(null);
    setExpandedRows(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/members"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-green transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Members
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-brand-green">Bulk Member Import</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-brand-green text-white"
                  : step > s
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s}
            </div>
            <span className={step === s ? "font-medium text-gray-900" : "text-gray-400"}>
              {s === 1 ? "Upload" : s === 2 ? "Preview" : "Done"}
            </span>
            {s < 3 && <span className="text-gray-200 mx-1">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1 — Upload */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upload CSV File</h2>
              <p className="text-sm text-gray-500 mt-1">
                Fill in the template, then upload it here. Maximum 500 members per file.
              </p>
            </div>
            <a
              href="/api/admin/members/import?action=template"
              download="members_import_template.csv"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-brand-green text-brand-green text-sm font-medium hover:bg-green-50 transition-colors flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              Download Template
            </a>
          </div>

          <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-4 bg-gray-50 hover:border-brand-green transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFileChange(file);
            }}
          >
            <Upload className="w-12 h-12 text-gray-300" />
            <div className="text-center">
              <p className="font-medium text-gray-700">Drop your CSV file here</p>
              <p className="text-sm text-gray-400 mt-1">or click to browse</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileChange(file);
              }}
            />
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-sm text-gray-500 justify-center py-2">
              <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
              Parsing file…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Note:</strong> Imported members are set to <em>active</em> immediately. No auth
            account is created at import time — use &ldquo;Reset Password&rdquo; on a member&apos;s detail page to
            grant login access later.
          </div>
        </div>
      )}

      {/* Step 2 — Preview */}
      {step === 2 && preview && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{preview.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total Rows</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{preview.valid}</p>
              <p className="text-xs text-gray-500 mt-1">Valid</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{preview.errors}</p>
              <p className="text-xs text-gray-500 mt-1">Errors</p>
            </div>
          </div>

          {preview.errors > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <span>Rows with errors will be skipped. Only {preview.valid} valid row{preview.valid !== 1 ? "s" : ""} will be imported.</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-left">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qualification</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Opening Balance</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.rows.map((row) => (
                    <Fragment key={row.rowNum}>
                      <tr
                        className={`hover:bg-gray-50 transition-colors ${
                          row.status !== "valid" ? "cursor-pointer" : ""
                        }`}
                        onClick={() => row.status !== "valid" && toggleExpand(row.rowNum)}
                      >
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{row.rowNum}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.data.full_name || <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">{row.data.phone || "—"}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.data.qualification || <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.data.job || <span className="text-gray-300 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {row.data.opening_balance && Number(row.data.opening_balance) > 0
                            ? `₹${Number(row.data.opening_balance).toLocaleString("en-IN")}`
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[row.status]}`}>
                            {STATUS_LABEL[row.status]}
                          </span>
                        </td>
                      </tr>
                      {row.status !== "valid" && expandedRows.has(row.rowNum) && (
                        <tr className="bg-red-50">
                          <td colSpan={7} className="px-4 py-3">
                            <ul className="list-disc list-inside space-y-1">
                              {row.errors.map((e, i) => (
                                <li key={i} className="text-xs text-red-700">{e}</li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-between">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleCommit}
              disabled={preview.valid === 0 || loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-green text-white text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Import {preview.valid} valid row{preview.valid !== 1 ? "s" : ""}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Result */}
      {step === 3 && commitResult && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-900">Import Complete</h2>
            <p className="text-gray-500 text-center">
              Successfully imported{" "}
              <span className="font-semibold text-green-700">{commitResult.succeeded}</span>{" "}
              member{commitResult.succeeded !== 1 ? "s" : ""}.
              {commitResult.failed > 0 && (
                <> <span className="text-red-600 font-semibold">{commitResult.failed}</span> failed.</>
              )}
            </p>
          </div>

          {commitResult.failed > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-red-700">Failed rows</h3>
              <div className="divide-y border border-red-100 rounded-lg overflow-hidden">
                {commitResult.results
                  .filter((r) => r.error)
                  .map((r, i) => (
                    <div key={i} className="px-4 py-3 bg-red-50 flex items-start gap-3">
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">{r.full_name} — {r.phone}</p>
                        <p className="text-xs text-red-700 mt-0.5">{r.error}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/admin/members?status=active"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-brand-green text-white font-semibold text-sm hover:bg-green-800 transition-colors"
            >
              <Users className="w-4 h-4" />
              View Imported Members
            </Link>
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
