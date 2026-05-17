"use client";

import { useState } from "react";
import { Loader2, CheckCircle, Star } from "lucide-react";
import { registerForEventAction } from "./actions";

interface Question {
  id: string;
  question_type: string;
  title: string;
  description: string | null;
  is_required: boolean;
  options: string[] | null;
}

export default function EventRegistrationForm({
  eventId,
  isFull,
  surveyId,
  organizationId,
  questions,
}: {
  eventId: string;
  isFull: boolean;
  surveyId: string | null;
  organizationId: string;
  questions: Question[];
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckbox = (questionId: string, option: string, checked: boolean) => {
    const current = (answers[questionId] as string[]) || [];
    handleAnswer(questionId, checked ? [...current, option] : current.filter((v) => v !== option));
  };

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
    // アンケート質問のバリデーション
    for (const q of questions) {
      const ans = answers[q.id];
      if (q.is_required && (ans === undefined || ans === "" || (Array.isArray(ans) && ans.length === 0))) {
        setError(`「${q.title}」は必須回答です`);
        return false;
      }
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
      surveyId: surveyId ?? undefined,
      organizationId,
      answers: questions.length > 0 ? answers : undefined,
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

        {/* アンケート質問 */}
        {questions.map((question, index) => (
          <div key={question.id} className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {question.title}
              {question.is_required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {question.description && (
              <p className="text-xs text-gray-400 mb-2">{question.description}</p>
            )}

            {question.question_type === "text" && (
              <input
                type="text"
                value={(answers[question.id] as string) || ""}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="回答を入力してください"
              />
            )}
            {question.question_type === "textarea" && (
              <textarea
                value={(answers[question.id] as string) || ""}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="回答を入力してください"
              />
            )}
            {question.question_type === "email" && (
              <input
                type="email"
                value={(answers[question.id] as string) || ""}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            )}
            {question.question_type === "number" && (
              <input
                type="number"
                value={(answers[question.id] as string) || ""}
                onChange={(e) => handleAnswer(question.id, e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
            {question.question_type === "radio" && (
              <div className="space-y-2">
                {question.options?.map((option, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="radio" name={question.id} value={option} checked={answers[question.id] === option}
                      onChange={() => handleAnswer(question.id, option)} className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}
            {question.question_type === "checkbox" && (
              <div className="space-y-2">
                {question.options?.map((option, i) => (
                  <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={((answers[question.id] as string[]) || []).includes(option)}
                      onChange={(e) => handleCheckbox(question.id, option, e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}
            {question.question_type === "select" && (
              <select value={(answers[question.id] as string) || ""} onChange={(e) => handleAnswer(question.id, e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">選択してください</option>
                {question.options?.map((option, i) => (
                  <option key={i} value={option}>{option}</option>
                ))}
              </select>
            )}
            {question.question_type === "rating" && (
              <div className="flex gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button key={rating} type="button" onClick={() => handleAnswer(question.id, rating)}
                    className="p-1 transition-transform hover:scale-110">
                    <Star className={`w-9 h-9 transition-colors ${((answers[question.id] as number) || 0) >= rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                  </button>
                ))}
                {answers[question.id] != null && (
                  <span className="self-center ml-2 text-sm text-gray-400">{String(answers[question.id])} / 5</span>
                )}
              </div>
            )}
          </div>
        ))}

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
