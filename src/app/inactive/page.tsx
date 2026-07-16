import { MoonStar } from "lucide-react";

export default function InactivePage() {
  return (
    <div className="min-h-screen brand-gradient flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center">
            <MoonStar className="w-10 h-10 text-brand-green" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-brand-green">
          Masjid Inactive
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          This masjid is currently inactive. Please contact the administrator
          for assistance.
        </p>
        <a
          href="/login"
          className="inline-block mt-4 text-sm text-brand-green underline"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}
