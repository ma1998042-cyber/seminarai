"use client";

import { useState, useTransition } from "react";
import { submitLpFormAction } from "./actions";
import { CheckCircle2, Loader2 } from "lucide-react";

type FormField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
};

export default function LpForm({
  slug,
  formFields,
  ctaText,
}: {
  slug: string;
  formFields: FormField[];
  ctaText: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const field of formFields) {
      initial[field.name] = "";
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [thankYouMessage, setThankYouMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await submitLpFormAction(slug, values);
      if (result.error) {
        setError(result.error);
      } else if (result.thankYouMessage) {
        setThankYouMessage(result.thankYouMessage);
      }
    });
  };

  if (thankYouMessage) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {thankYouMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <form onSubmit={handleSubmit} className="p-8 space-y-5">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          お申し込みフォーム
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {formFields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {field.label}
              {field.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>

            {field.type === "textarea" ? (
              <textarea
                name={field.name}
                value={values[field.name] ?? ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : field.type === "select" ? (
              <select
                name={field.name}
                value={values[field.name] ?? ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">選択してください</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                name={field.name}
                value={values[field.name] ?? ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {ctaText}
        </button>
      </form>
    </div>
  );
}
