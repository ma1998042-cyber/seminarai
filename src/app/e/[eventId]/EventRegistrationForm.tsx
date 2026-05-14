"use client";

import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { registerForEventAction } from "./actions";

export default function EventRegistrationForm({
  eventId,
  isFull,
}: {
  eventId: string;
  isFull: boolean;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (!fullName.trim()) {
      setError("お名前を入力してください");
      return false;
    }
    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("有効なメールアドレスを入力してください");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setSubmitting(true);

    const result = await registerForEventAction(eventId, {
      email: email.trim(),
      fullName: fullName.trim(),
    });

    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            お申し込みが完了しました
          </h2>
          <p className="text-gray-400 text-sm">このページを閉じていただいて構いません</p>
        </div>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-2">定員に達しました</h2>
          <p className="text-gray-400">現在、このイベントへの申し込みを受け付けておりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">参加申し込み</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="山田 太郎"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@example.com"
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
        >
          {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
          申し込む
        </button>
      </form>
    </div>
  );
}
