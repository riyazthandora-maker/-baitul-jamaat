"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Crown, Trash2, Plus, Loader2, Pencil, Check, X } from "lucide-react";

const RELATIONSHIPS = ["head","husband","wife","son","daughter","father","mother","brother","sister","other"] as const;
type Relationship = typeof RELATIONSHIPS[number];

interface FamilyMemberRow {
  id: string;
  member_id: string;
  relationship: string;
  member: {
    id: string;
    full_name: string;
    dob: string | null;
    gender: string | null;
    photo_url: string | null;
    member_number: string | null;
  };
}

interface FamilyData {
  id: string;
  name: string;
  head_member_id: string;
  family_members: FamilyMemberRow[];
}

interface AvailableMember {
  id: string;
  full_name: string;
  member_number: string | null;
}

export default function FamilyDetail({
  family: initialFamily,
  availableMembers: initialAvailable,
}: {
  family: FamilyData;
  availableMembers: AvailableMember[];
}) {
  const router = useRouter();
  const [family, setFamily] = useState(initialFamily);
  const [availableMembers, setAvailableMembers] = useState(initialAvailable);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(family.name);
  const [addMemberId, setAddMemberId] = useState("");
  const [addRelationship, setAddRelationship] = useState<Relationship>("other");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingFamily, setDeletingFamily] = useState(false);

  const head = family.family_members.find((fm) => fm.member_id === family.head_member_id);
  const others = family.family_members.filter((fm) => fm.member_id !== family.head_member_id);

  async function saveName() {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/admin/families/${family.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setFamily((f) => ({ ...f, name: data.family.name }));
      setEditingName(false);
    } else {
      setError(data.error ?? "Failed to save");
    }
    setSaving(false);
  }

  async function addMember() {
    if (!addMemberId) return;
    setAdding(true);
    setError(null);
    const res = await fetch(`/api/admin/families/${family.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member_id: addMemberId, relationship: addRelationship }),
    });
    const data = await res.json();
    if (res.ok) {
      const addedMember = availableMembers.find((m) => m.id === addMemberId);
      if (addedMember) {
        setFamily((f) => ({
          ...f,
          family_members: [
            ...f.family_members,
            {
              id: data.member.id,
              member_id: addMemberId,
              relationship: addRelationship,
              member: { id: addMemberId, full_name: addedMember.full_name, dob: null, gender: null, photo_url: null, member_number: addedMember.member_number },
            },
          ],
        }));
        setAvailableMembers((prev) => prev.filter((m) => m.id !== addMemberId));
        setAddMemberId("");
      }
      router.refresh();
    } else {
      setError(data.error ?? "Failed to add member");
    }
    setAdding(false);
  }

  async function removeMember(memberId: string) {
    setDeleting(memberId);
    setError(null);
    const res = await fetch(`/api/admin/families/${family.id}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) {
      const removed = family.family_members.find((fm) => fm.member_id === memberId);
      setFamily((f) => ({ ...f, family_members: f.family_members.filter((fm) => fm.member_id !== memberId) }));
      if (removed) {
        setAvailableMembers((prev) => [...prev, { id: memberId, full_name: removed.member.full_name, member_number: removed.member.member_number }]);
      }
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to remove");
    }
    setDeleting(null);
  }

  async function updateRelationship(memberId: string, relationship: Relationship) {
    const res = await fetch(`/api/admin/families/${family.id}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relationship }),
    });
    if (res.ok) {
      setFamily((f) => ({
        ...f,
        family_members: f.family_members.map((fm) =>
          fm.member_id === memberId ? { ...fm, relationship } : fm
        ),
      }));
      if (relationship === "head") {
        const res2 = await fetch(`/api/admin/families/${family.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ head_member_id: memberId }),
        });
        if (res2.ok) setFamily((f) => ({ ...f, head_member_id: memberId }));
      }
    }
  }

  async function deleteFamily() {
    if (!confirm("Delete this family? Members will not be deleted.")) return;
    setDeletingFamily(true);
    const res = await fetch(`/api/admin/families/${family.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/families");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to delete");
      setDeletingFamily(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Family name */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center gap-3">
          {editingName ? (
            <>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded-lg border border-brand-green px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
                autoFocus
              />
              <button onClick={saveName} disabled={saving} className="text-brand-green hover:text-brand-green-dark">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              </button>
              <button onClick={() => { setEditingName(false); setNewName(family.name); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-800 flex-1">{family.name}</h2>
              <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-brand-green">
                <Pencil className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-1">{family.family_members.length} member(s)</p>
      </div>

      {/* Family Tree */}
      <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Family Tree</h2>

        {/* Head */}
        {head && (
          <div className="space-y-2">
            <MemberRow
              fm={head}
              isHead
              onRelChange={(r) => updateRelationship(head.member_id, r)}
              onRemove={() => removeMember(head.member_id)}
              removing={deleting === head.member_id}
              canRemove={family.family_members.length > 1}
            />
            {/* Dependants */}
            {others.map((fm) => (
              <div key={fm.id} className="ml-8 pl-4 border-l-2 border-gray-100">
                <MemberRow
                  fm={fm}
                  isHead={false}
                  onRelChange={(r) => updateRelationship(fm.member_id, r)}
                  onRemove={() => removeMember(fm.member_id)}
                  removing={deleting === fm.member_id}
                  canRemove
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add member */}
      {availableMembers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Add Member</h2>
          <div className="flex gap-2 flex-wrap">
            <select
              value={addMemberId}
              onChange={(e) => setAddMemberId(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="">Select member…</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}{m.member_number ? ` (${m.member_number})` : ""}</option>
              ))}
            </select>
            <select
              value={addRelationship}
              onChange={(e) => setAddRelationship(e.target.value as Relationship)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={addMember}
              disabled={!addMemberId || adding}
              className="flex items-center gap-1 bg-brand-green text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-green-dark transition-colors disabled:opacity-60"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div className="border border-red-100 rounded-xl p-5 space-y-2">
        <h2 className="font-semibold text-red-700 text-sm">Danger Zone</h2>
        <p className="text-sm text-gray-500">Deleting this family only removes the grouping. Members are not deleted.</p>
        <button
          onClick={deleteFamily}
          disabled={deletingFamily}
          className="flex items-center gap-2 text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
        >
          {deletingFamily ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete Family
        </button>
      </div>
    </div>
  );
}

function MemberRow({
  fm,
  isHead,
  onRelChange,
  onRemove,
  removing,
  canRemove,
}: {
  fm: FamilyMemberRow;
  isHead: boolean;
  onRelChange: (r: Relationship) => void;
  onRemove: () => void;
  removing: boolean;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center flex-shrink-0">
        {isHead ? (
          <Crown className="w-4 h-4 text-brand-gold" />
        ) : (
          <UserCircle className="w-4 h-4 text-brand-green" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{fm.member.full_name}</p>
        {fm.member.member_number && <p className="text-xs text-gray-400">{fm.member.member_number}</p>}
      </div>
      <select
        value={fm.relationship}
        onChange={(e) => onRelChange(e.target.value as Relationship)}
        className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-green text-gray-600"
      >
        {(["head","husband","wife","son","daughter","father","mother","brother","sister","other"] as const).map((r) => (
          <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
        ))}
      </select>
      {canRemove && (
        <button
          onClick={onRemove}
          disabled={removing}
          className="text-red-400 hover:text-red-600 disabled:opacity-40"
          title="Remove from family"
        >
          {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
