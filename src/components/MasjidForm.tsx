"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Building2, MapPin, Phone, CreditCard, User, Hash, Bell } from "lucide-react";
import CredentialsModal from "@/components/CredentialsModal";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

interface MasjidFormData {
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  masjid_code?: string;
  upi_id?: string | null;
  contact_email?: string | null;
  lat?: number | null;
  lng?: number | null;
  active?: boolean;
}

interface Credentials {
  phone: string;
  password: string;
  masjidName: string;
}

interface Props {
  initialData?: MasjidFormData;
  isNew?: boolean;
  applicationId?: string;
  prefillData?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export default function MasjidForm({ initialData, isNew = false, applicationId, prefillData }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(initialData?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initialData?.lng ?? null);
  // Credentials are shown inline after creation — no sessionStorage/separate page
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    // masjid_code is disabled on edit → read from initialData instead of FormData
    const masjidCode = isNew
      ? ((fd.get("masjid_code") as string | null) ?? "").toUpperCase()
      : (initialData?.masjid_code ?? "");

    const basePayload = {
      name: fd.get("name") as string,
      address: fd.get("address") as string,
      phone: fd.get("phone") as string,
      masjid_code: masjidCode,
      upi_id: (fd.get("upi_id") as string) || null,
      contact_email: (fd.get("contact_email") as string) || null,
      active: fd.get("active") === "on",
      lat,
      lng,
    };

    // Admin fields only sent on creation
    const payload = isNew
      ? {
          ...basePayload,
          admin_name: fd.get("admin_name") as string,
          admin_phone: fd.get("admin_phone") as string,
          ...(applicationId ? { application_id: applicationId } : {}),
        }
      : basePayload;

    startTransition(async () => {
      const url = isNew
        ? "/api/superadmin/masjids"
        : `/api/superadmin/masjids/${initialData?.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      if (isNew && data.credentials) {
        // Show modal inline — no navigation, no sessionStorage
        setCredentials(data.credentials);
      } else {
        router.push("/superadmin/masjids");
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* Inline credentials modal — shown after creation, dismissed to masjids list */}
      {credentials && (
        <CredentialsModal
          credentials={credentials}
          onDone={() => {
            setCredentials(null);
            router.push("/superadmin/masjids");
            router.refresh();
          }}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Masjid Details */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-green" />
            Masjid Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Masjid Name *
              </label>
              <input
                name="name"
                defaultValue={prefillData?.name ?? initialData?.name}
                required
                placeholder="e.g. Masjid Al-Noor"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Address *
              </label>
              <textarea
                name="address"
                defaultValue={prefillData?.address ?? initialData?.address}
                required
                rows={2}
                placeholder="Full address"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Phone *
              </label>
              <input
                name="phone"
                type="tel"
                defaultValue={prefillData?.phone ?? initialData?.phone}
                required
                placeholder="e.g. 9876543210"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> Masjid Code *
              </label>
              <input
                name="masjid_code"
                defaultValue={initialData?.masjid_code}
                required={isNew}
                placeholder="e.g. BJM"
                maxLength={6}
                className={`w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green uppercase font-mono ${
                  !isNew
                    ? "bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed"
                    : "border-gray-300"
                }`}
                style={{ textTransform: "uppercase" }}
                disabled={!isNew}
                readOnly={!isNew}
              />
              <p className="text-xs text-gray-400">
                2–6 uppercase letters. Used in M-{"{CODE}"}-0001 member numbers.
                {!isNew && " Cannot be changed after creation."}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> GPay / UPI ID
              </label>
              <input
                name="upi_id"
                defaultValue={initialData?.upi_id ?? ""}
                placeholder="e.g. masjid@okaxis"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5" /> Contact Email
              </label>
              <input
                name="contact_email"
                type="email"
                defaultValue={prefillData?.email ?? initialData?.contact_email ?? ""}
                placeholder="e.g. admin@masjid.com"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
              <p className="text-xs text-gray-400">
                Used for notification emails: new member registrations, monthly statements.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                name="active"
                id="active"
                defaultChecked={initialData?.active ?? true}
                className="w-5 h-5 rounded border-gray-300 text-brand-green focus:ring-brand-green"
              />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">
                Active (uncheck to disable all access)
              </label>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-green" />
            Location{" "}
            <span className="text-xs font-normal text-gray-400">
              (optional — click map to pin)
            </span>
          </h2>
          <MapPicker
            lat={lat}
            lng={lng}
            onChange={(la, ln) => {
              setLat(la);
              setLng(ln);
            }}
          />
          {lat && lng && (
            <p className="text-xs text-gray-500 font-mono">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          )}
        </div>

        {/* Admin Account — new masjids only */}
        {isNew && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-5">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-green" />
              Masjid Admin Account
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Admin Full Name *
                </label>
                <input
                  name="admin_name"
                  required
                  placeholder="e.g. Ahmad Farooq"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Admin Phone (10 digits) *
                </label>
                <input
                  name="admin_phone"
                  type="tel"
                  required
                  pattern="[0-9]{10}"
                  placeholder="e.g. 9876543210"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
                />
              </div>
            </div>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              A temporary password will be generated and shown once. Copy it before closing.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 sm:flex-none sm:px-8 border border-gray-300 text-gray-700 rounded-lg py-3 text-base font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-brand-green text-white rounded-lg py-3 text-base font-semibold hover:bg-brand-green-dark transition-colors disabled:opacity-60"
          >
            {isPending ? "Saving…" : isNew ? "Create Masjid" : "Save Changes"}
          </button>
        </div>
      </form>
    </>
  );
}
