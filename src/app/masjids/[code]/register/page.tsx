"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  BookOpen,
  CreditCard,
} from "lucide-react";

type OcrResult = {
  name: string | null;
  dob: string | null;
  gender: string | null;
  address: string | null;
  id_type: string | null;
  id_last4: string | null;
} | null;

export default function RegisterPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [masjidName, setMasjidName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);

  // File refs
  const idDocRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [idDocFile, setIdDocFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form fields
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    dob: "",
    gender: "",
    address: "",
    id_type: "",
    id_last4: "",
    qualification: "",
  });

  useEffect(() => {
    // Fetch masjid name to display
    fetch(`/api/masjids/${code}/info`)
      .then((r) => r.json())
      .then((d) => setMasjidName(d.name ?? code))
      .catch(() => setMasjidName(code));
  }, [code]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleIdDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdDocFile(file);
    setOcrDone(false);

    // Trigger OCR for images only
    if (file.type.startsWith("image/")) {
      setOcrLoading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/masjids/${code}/ocr`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (data.ocr) {
          const ocr: OcrResult = data.ocr;
          setForm((prev) => ({
            ...prev,
            full_name: ocr?.name ?? prev.full_name,
            dob: ocr?.dob ?? prev.dob,
            gender: ocr?.gender ?? prev.gender,
            address: ocr?.address ?? prev.address,
            id_type: ocr?.id_type ?? prev.id_type,
            id_last4: ocr?.id_last4 ?? prev.id_last4,
          }));
          setOcrDone(true);
        }
      } catch {
        // OCR failed silently — user fills manually
      } finally {
        setOcrLoading(false);
      }
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!idDocFile) {
      setError("Please upload your ID document (Aadhaar or Passport).");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("id_doc", idDocFile);
      if (photoFile) fd.append("photo", photoFile);

      const res = await fetch(`/api/masjids/${code}/register`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen brand-gradient flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-brand-green mx-auto" />
          <h1 className="text-2xl font-bold text-brand-green">
            Registration Submitted!
          </h1>
          <p className="text-gray-600 leading-relaxed">
            Your registration has been submitted to{" "}
            <strong>{masjidName}</strong>. The admin will review and approve
            your membership. You will receive your member number and login
            details once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="brand-gradient text-white py-6 px-4 text-center">
        <p className="text-sm opacity-80 mb-1">Member Registration</p>
        <h1 className="text-2xl font-bold">{masjidName || code}</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-lg mx-auto p-4 space-y-5 pb-12"
      >
        {/* Contact Info */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-brand-green flex items-center gap-2 text-lg">
            <Phone className="w-5 h-5" /> Contact Information
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
        </section>

        {/* ID Document */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-brand-green flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" /> Identity Document{" "}
            <span className="text-red-500">*</span>
          </h2>
          <p className="text-sm text-gray-500">
            Upload Aadhaar or Passport (JPG, PNG, or PDF · max 5 MB)
          </p>

          <input
            ref={idDocRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={handleIdDocChange}
          />

          <button
            type="button"
            onClick={() => idDocRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl py-6 flex flex-col items-center gap-2 transition-colors ${
              idDocFile
                ? "border-brand-green bg-brand-green/5"
                : "border-gray-300 hover:border-brand-green"
            }`}
          >
            {idDocFile ? (
              <>
                <CheckCircle className="w-8 h-8 text-brand-green" />
                <span className="text-sm text-brand-green font-medium">
                  {idDocFile.name}
                </span>
                <span className="text-xs text-gray-400">Tap to change</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-500">
                  Tap to upload document
                </span>
              </>
            )}
          </button>

          {ocrLoading && (
            <div className="flex items-center gap-2 text-brand-green text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading document automatically…
            </div>
          )}
          {ocrDone && (
            <div className="flex items-center gap-2 text-brand-green text-sm">
              <CheckCircle className="w-4 h-4" />
              Details pre-filled from document — please review below
            </div>
          )}
        </section>

        {/* Personal Details */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-brand-green flex items-center gap-2 text-lg">
            <User className="w-5 h-5" /> Personal Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="As on identity document"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => set("dob", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              rows={3}
              placeholder="Your home address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green resize-none min-h-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Type
              </label>
              <select
                value={form.id_type}
                onChange={(e) => set("id_type", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              >
                <option value="">Select</option>
                <option value="aadhaar">Aadhaar</option>
                <option value="passport">Passport</option>
                <option value="pan">PAN Card</option>
                <option value="voter_id">Voter ID</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last 4 Digits
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="XXXX"
                value={form.id_last4}
                onChange={(e) =>
                  set("id_last4", e.target.value.replace(/\D/g, ""))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            </div>
          </div>
        </section>

        {/* Qualification */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-brand-green flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" /> Education / Occupation
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Highest Qualification or Job{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              list="qual-suggestions"
              placeholder="e.g. Graduate, Engineer, Teacher, Business"
              value={form.qualification}
              onChange={(e) => set("qualification", e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
            <datalist id="qual-suggestions">
              {[
                "10th Pass",
                "12th Pass",
                "Graduate",
                "Post Graduate",
                "Engineer",
                "Doctor",
                "Teacher",
                "Business",
                "Farmer",
                "Driver",
                "Skilled Worker",
                "Other",
              ].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        </section>

        {/* Photo */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-brand-green flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5" /> Your Photo{" "}
            <span className="text-sm font-normal text-gray-400">(optional)</span>
          </h2>

          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
          />

          {photoPreview ? (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-green flex-shrink-0">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="text-sm text-brand-green underline"
              >
                Change photo
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-brand-green transition-colors"
            >
              <Camera className="w-8 h-8 text-gray-400" />
              <span className="text-sm text-gray-500">
                Take or upload a photo
              </span>
            </button>
          )}
        </section>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand-green text-white py-4 rounded-xl text-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Submitting…
            </>
          ) : (
            "Submit Registration"
          )}
        </button>
      </form>
    </div>
  );
}
