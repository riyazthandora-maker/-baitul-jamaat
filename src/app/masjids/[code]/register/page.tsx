"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Info,
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
  const [ocrFrozen, setOcrFrozen] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const personalSectionRef = useRef<HTMLElement>(null);

  // File refs
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
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
    fetch(`/api/masjids/${code}/info`)
      .then((r) => r.json())
      .then((d) => setMasjidName(d.name ?? code))
      .catch(() => setMasjidName(code));
  }, [code]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetForm() {
    setSubmitted(false);
    setSubmitting(false);
    setError(null);
    setOcrLoading(false);
    setOcrFrozen(false);
    setOcrDone(false);
    setOcrError(null);
    setIdFrontFile(null);
    setIdBackFile(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setForm({
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
    if (idFrontRef.current) idFrontRef.current.value = "";
    if (idBackRef.current) idBackRef.current.value = "";
    if (photoRef.current) photoRef.current.value = "";
  }

  const runOcr = useCallback(
    async (front: File, back: File | null) => {
      setOcrLoading(true);
      setOcrFrozen(true);
      setOcrDone(false);
      setOcrError(null);
      try {
        const fd = new FormData();
        fd.append("front", front);
        if (back) fd.append("back", back);
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
          setTimeout(() => {
            personalSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 100);
        } else {
          setOcrError("Could not read the document automatically. Please fill in your details manually below.");
        }
      } catch {
        setOcrError("Document scan failed. Please fill in your details manually below.");
      } finally {
        setOcrLoading(false);
        setOcrFrozen(false);
      }
    },
    [code]
  );

  async function handleFrontChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFrontFile(file);
    await runOcr(file, idBackFile);
  }

  async function handleBackChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdBackFile(file);
    if (idFrontFile) {
      await runOcr(idFrontFile, file);
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
    if (!idFrontFile) {
      setError("Please upload the front side of your ID document.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("id_doc_front", idFrontFile);
      if (idBackFile) fd.append("id_doc_back", idBackFile);
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
          <button
            type="button"
            onClick={resetForm}
            className="w-full border-2 border-brand-green text-brand-green py-3 rounded-xl font-semibold hover:bg-brand-green/5 transition-colors"
          >
            Register Another Member
          </button>
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

        {/* ID Document — two slots */}
        <section className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-brand-green flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5" /> Identity Document{" "}
            <span className="text-red-500">*</span>
          </h2>
          <p className="text-sm text-gray-500">
            Upload Aadhaar, Passport, or Voter ID (JPG, PNG, PDF · max 5 MB each).
            Adding the back side improves address extraction.
          </p>

          <input ref={idFrontRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleFrontChange} />
          <input ref={idBackRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleBackChange} />

          <div className="grid grid-cols-2 gap-3">
            {/* Front slot */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600 text-center">
                Front side <span className="text-red-500">*</span>
              </p>
              <button
                type="button"
                onClick={() => idFrontRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl py-5 flex flex-col items-center gap-1.5 transition-colors text-center ${
                  idFrontFile
                    ? "border-brand-green bg-brand-green/5"
                    : "border-gray-300 hover:border-brand-green"
                }`}
              >
                {idFrontFile ? (
                  <>
                    <CheckCircle className="w-7 h-7 text-brand-green" />
                    <span className="text-xs text-brand-green font-medium leading-tight px-1 break-all">
                      {idFrontFile.name.length > 18
                        ? idFrontFile.name.slice(0, 15) + "…"
                        : idFrontFile.name}
                    </span>
                    <span className="text-xs text-gray-400">Tap to change</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-gray-400" />
                    <span className="text-xs text-gray-500">Upload front</span>
                  </>
                )}
              </button>
            </div>

            {/* Back slot */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600 text-center">
                Back side{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </p>
              <button
                type="button"
                onClick={() => idBackRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl py-5 flex flex-col items-center gap-1.5 transition-colors text-center ${
                  idBackFile
                    ? "border-brand-green bg-brand-green/5"
                    : "border-gray-300 hover:border-brand-green"
                }`}
              >
                {idBackFile ? (
                  <>
                    <CheckCircle className="w-7 h-7 text-brand-green" />
                    <span className="text-xs text-brand-green font-medium leading-tight px-1 break-all">
                      {idBackFile.name.length > 18
                        ? idBackFile.name.slice(0, 15) + "…"
                        : idBackFile.name}
                    </span>
                    <span className="text-xs text-gray-400">Tap to change</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-gray-300" />
                    <span className="text-xs text-gray-400">Upload back</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {ocrLoading && (
            <div className="flex items-center gap-2 text-brand-green text-sm bg-brand-green/5 rounded-lg px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              Reading your document — please wait…
            </div>
          )}
          {ocrDone && (
            <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Details filled from document — scroll down to review and edit
            </div>
          )}
          {ocrError && (
            <div className="flex items-start gap-2 text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {ocrError}
            </div>
          )}
        </section>

        {/* Personal Details */}
        <section ref={personalSectionRef} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-brand-green flex items-center gap-2 text-lg">
            <User className="w-5 h-5" /> Personal Details
            {ocrFrozen && (
              <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-brand-green bg-brand-green/10 px-2 py-1 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin" /> Reading document…
              </span>
            )}
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
              disabled={ocrFrozen}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-wait"
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
                disabled={ocrFrozen}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-wait"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={form.gender}
                onChange={(e) => set("gender", e.target.value)}
                disabled={ocrFrozen}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-wait"
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
              disabled={ocrFrozen}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green resize-none min-h-0 disabled:opacity-50 disabled:cursor-wait"
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
                disabled={ocrFrozen}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-wait"
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
                disabled={ocrFrozen}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-wait"
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
            <select
              value={form.qualification === "" || [
                "10th Pass","12th Pass","Graduate","Post Graduate",
                "Engineer","Doctor","Teacher","Business","Farmer",
                "Driver","Skilled Worker",
              ].includes(form.qualification) ? form.qualification : "Other"}
              onChange={(e) => {
                if (e.target.value !== "Other") set("qualification", e.target.value);
                else set("qualification", "Other");
              }}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="">Select…</option>
              <option value="10th Pass">10th Pass</option>
              <option value="12th Pass">12th Pass</option>
              <option value="Graduate">Graduate</option>
              <option value="Post Graduate">Post Graduate</option>
              <option value="Engineer">Engineer</option>
              <option value="Doctor">Doctor</option>
              <option value="Teacher">Teacher</option>
              <option value="Business">Business</option>
              <option value="Farmer">Farmer</option>
              <option value="Driver">Driver</option>
              <option value="Skilled Worker">Skilled Worker</option>
              <option value="Other">Other (specify below)</option>
            </select>
            {(form.qualification === "Other" || (form.qualification !== "" && ![
              "10th Pass","12th Pass","Graduate","Post Graduate",
              "Engineer","Doctor","Teacher","Business","Farmer",
              "Driver","Skilled Worker","Other",
            ].includes(form.qualification))) && (
              <input
                type="text"
                placeholder="Please specify"
                value={form.qualification === "Other" ? "" : form.qualification}
                onChange={(e) => set("qualification", e.target.value)}
                required
                className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
            )}
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
