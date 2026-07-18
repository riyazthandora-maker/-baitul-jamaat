"use client";

import { useState, useTransition } from "react";
import { Building2, Mail, Phone, MapPin, CheckCircle } from "lucide-react";

export default function MasjidApplicationForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const payload = {
      name: fd.get("name") as string,
      address: fd.get("address") as string,
      email: fd.get("email") as string,
      phone: fd.get("phone") as string,
      _trap: fd.get("_trap") as string,
    };

    startTransition(async () => {
      const res = await fetch("/api/public/masjid-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSubmittedEmail(payload.email);
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-brand-gold/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-brand-gold" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Request Submitted!</h3>
        <p className="text-white/70 text-sm leading-relaxed">
          Your registration request has been received. We will review it and
          contact you at{" "}
          <span className="text-white font-semibold">{submittedEmail}</span>{" "}
          within a few days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — hidden from real users, bots fill it and get silently rejected */}
      <input
        name="_trap"
        type="text"
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-sm font-medium text-white/80">
            Masjid Name *
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3.5 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              name="name"
              required
              minLength={3}
              placeholder="e.g. Masjid Al-Noor"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
            />
          </div>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <label className="block text-sm font-medium text-white/80">
            Full Address *
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-white/40 pointer-events-none" />
            <textarea
              name="address"
              required
              minLength={10}
              rows={2}
              placeholder="Full address of the masjid"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">
            Contact Email *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              name="email"
              type="email"
              required
              placeholder="admin@yourmasjid.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-white/80">
            Contact Phone *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3.5 w-4 h-4 text-white/40 pointer-events-none" />
            <input
              name="phone"
              type="tel"
              required
              placeholder="e.g. 9876543210"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-gold hover:bg-brand-gold-dark text-white font-bold text-base py-3.5 rounded-xl transition-colors disabled:opacity-60"
      >
        {isPending ? "Submitting…" : "Submit Registration Request"}
      </button>
    </form>
  );
}
