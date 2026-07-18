"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Users2, Sparkles, Plus, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const RELATIONSHIPS = ["head","husband","wife","son","daughter","father","mother","brother","sister","other"] as const;
type Relationship = typeof RELATIONSHIPS[number];

interface ActiveMember {
  id: string;
  full_name: string;
  dob: string | null;
  gender: string | null;
  member_number: string | null;
}

interface FamilyRow {
  member_id: string;
  relationship: Relationship;
}

interface Suggestion {
  suggested_name: string;
  head_index: number;
  confidence: string;
  confidence_note: string;
  members: Array<{ index: number; relationship: Relationship }>;
}

export default function NewFamilyPage() {
  const router = useRouter();
  const [allMembers, setAllMembers] = useState<ActiveMember[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [familyName, setFamilyName] = useState("");
  const [headMemberId, setHeadMemberId] = useState("");
  const [rows, setRows] = useState<FamilyRow[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestedMembersList, setSuggestedMembersList] = useState<ActiveMember[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("members")
      .select("id, full_name, dob, gender, member_number")
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => setAllMembers(data ?? []));
  }, []);

  const filteredMembers = allMembers.filter((m) =>
    m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.member_number ?? "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  function toggleMember(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSuggest() {
    setSuggestError(null);
    setSuggestLoading(true);
    try {
      const supabase = createClient();
      // Find members already grouped into a family
      const { data: grouped } = await supabase
        .from("family_members")
        .select("member_id");
      const groupedIds = new Set((grouped ?? []).map((r) => r.member_id));
      const ungrouped = allMembers.filter((m) => !groupedIds.has(m.id));

      if (ungrouped.length < 2) {
        setSuggestError("Not enough ungrouped members (need at least 2) to generate suggestions.");
        return;
      }

      setSuggestedMembersList(ungrouped);
      const res = await fetch("/api/admin/families/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_ids: ungrouped.map((m) => m.id) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Suggestion failed");
      setSuggestions(data.suggestions ?? []);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Failed to get suggestions");
    } finally {
      setSuggestLoading(false);
    }
  }

  function applySuggestion(s: Suggestion) {
    setFamilyName(s.suggested_name);
    const head = suggestedMembersList[s.head_index];
    if (head) setHeadMemberId(head.id);
    const newRows = s.members
      .filter((sm) => suggestedMembersList[sm.index])
      .map((sm) => ({
        member_id: suggestedMembersList[sm.index].id,
        relationship: sm.relationship,
      }));
    setRows(newRows);
    setSelectedIds(new Set(newRows.map((r) => r.member_id)));
    setStep(2);
  }

  function proceedManually() {
    const arr = [...selectedIds];
    setRows(arr.map((id, i) => ({ member_id: id, relationship: (i === 0 ? "head" : "other") as Relationship })));
    if (arr[0]) setHeadMemberId(arr[0]);
    setStep(2);
  }

  function updateRow(memberId: string, relationship: Relationship) {
    setRows((prev) => prev.map((r) => r.member_id === memberId ? { ...r, relationship } : r));
    if (relationship === "head") setHeadMemberId(memberId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) { setError("Family name is required."); return; }
    if (!headMemberId) { setError("Please designate the head of family."); return; }
    if (rows.length === 0) { setError("Add at least one member."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/families", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: familyName.trim(), head_member_id: headMemberId, members: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed to create family");
      router.push(`/admin/families/${data.family.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create family");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/families" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-brand-green">New Family</h1>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 space-y-4">
            <h2 className="font-semibold text-gray-800">Step 1: Select Members</h2>
            <input
              type="search"
              placeholder="Search members…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredMembers.map((m) => (
                <label key={m.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded accent-brand-green"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleMember(m.id)}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{m.full_name}</span>
                    {m.member_number && <span className="text-gray-400 ml-1">({m.member_number})</span>}
                    {m.gender && <span className="text-gray-400 ml-1">· {m.gender}</span>}
                  </span>
                </label>
              ))}
              {filteredMembers.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No active members found.</p>}
            </div>
            <p className="text-sm text-gray-500">{selectedIds.size} selected</p>
          </div>

          {/* Gemini suggestions */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-amber-100 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-gold" />
              <h2 className="font-semibold text-gray-800">AI Suggestions (Optional)</h2>
            </div>
            <p className="text-sm text-gray-500">
              Click below — Gemini will automatically find members not yet in any family and suggest groupings based on names, ages, gender, and address.
            </p>
            {suggestError && <p className="text-sm text-red-600">{suggestError}</p>}
            <button
              type="button"
              onClick={handleSuggest}
              disabled={suggestLoading}
              className="flex items-center gap-2 bg-brand-gold text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-gold-dark transition-colors disabled:opacity-60"
            >
              {suggestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {suggestLoading ? "Asking Gemini…" : "Get Suggestions"}
            </button>

            {suggestions.length > 0 && (
              <div className="space-y-3 mt-2">
                <p className="text-xs text-gray-400 italic">
                  These are suggestions only — review and edit before saving. Based on {suggestedMembersList.length} ungrouped member(s).
                </p>
                {suggestions.map((s, i) => (
                  <div key={i} className="border border-amber-200 rounded-lg p-4 space-y-2 bg-amber-50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-800">{s.suggested_name}</p>
                        <p className="text-xs text-gray-500">Confidence: <span className="font-medium">{s.confidence}</span> — {s.confidence_note}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="text-xs bg-brand-green text-white px-3 py-1 rounded-lg hover:bg-brand-green-dark transition-colors whitespace-nowrap"
                      >
                        Use This
                      </button>
                    </div>
                    <ul className="text-sm space-y-1">
                      {s.members.map((sm) => {
                        const mem = suggestedMembersList[sm.index];
                        return mem ? (
                          <li key={sm.index} className="flex items-center gap-2 text-gray-700">
                            <span className="w-2 h-2 rounded-full bg-brand-green flex-shrink-0" />
                            <span className="font-medium">{mem.full_name}</span>
                            <span className="text-gray-400">→ {sm.relationship}</span>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={proceedManually}
            disabled={selectedIds.size === 0}
            className="w-full flex items-center justify-center gap-2 bg-brand-green text-white py-3 rounded-lg font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Create Family with {selectedIds.size} Member(s)
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 space-y-4">
            <h2 className="font-semibold text-gray-800">Step 2: Family Details</h2>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Family Name</label>
              <input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="e.g. Ahmed Family"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Members &amp; Relationships</label>
              {rows.map((row) => {
                const member = allMembers.find((m) => m.id === row.member_id);
                return (
                  <div key={row.member_id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{member?.full_name}</span>
                    <select
                      value={row.relationship}
                      onChange={(e) => updateRow(row.member_id, e.target.value as Relationship)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400">
              Head member: <span className="font-medium">{allMembers.find((m) => m.id === headMemberId)?.full_name ?? "not set"}</span>
              {" "}(set relationship to &quot;Head&quot; to change)
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-green text-white py-3 rounded-lg font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users2 className="w-4 h-4" />}
              {submitting ? "Saving…" : "Save Family"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
