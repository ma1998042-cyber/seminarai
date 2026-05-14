"use client";

import { useState } from "react";
import { Loader2, CheckCircle, Star, CreditCard } from "lucide-react";
import { submitSurveyResponse } from "./actions";

interface Question {
  id: string;
  question_type: string;
  title: string;
  description: string | null;
  is_required: boolean;
  options: string[] | null;
}

interface Survey {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  thank_you_message: string | null;
  is_anonymous: boolean;
  payment_enabled: boolean;
  payment_amount: number;
}

export default function SurveyForm({ survey, questions }: { survey: Survey; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
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
    if (!validate()) return;

    setSubmitting(true);
    setError("");

    if (survey.payment_enabled && survey.payment_amount > 0) {
      // Redirect to Stripe Checkout
      const res = await fetch("/api/stripe/survey-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: survey.id,
          respondentName,
          respondentEmail,
          answers,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
      return;
    }

    const result = await submitSurveyResponse(
      survey.id,
      survey.organization_id,
      respondentName,
      respondentEmail,
      answers
    );

    setSubmitting(false);
    if (result.error) { setError(result.error); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {survey.thank_you_message || "ご回答ありがとうございました！"}
          </h2>
          <p className="text-gray-400 text-sm">このページを閉じていただいて構いません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 mb-6 border border-gray-100 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{survey.title}</h1>
          {survey.description && (
            <p className="text-gray-500 leading-relaxed">{survey.description}</p>
          )}
          {survey.payment_enabled && survey.payment_amount > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-indigo-50 rounded-xl px-4 py-3">
              <CreditCard className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <p className="text-sm font-medium text-indigo-700">
                参加費：¥{survey.payment_amount.toLocaleString()}（送信後にカード決済画面に進みます）
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!survey.is_anonymous && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">お名前・連絡先（任意）</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">お名前</label>
                  <input
                    type="text"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="山田 太郎"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
                  <input
                    type="email"
                    value={respondentEmail}
                    onChange={(e) => setRespondentEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
            </div>
          )}

          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <label className="block text-base font-semibold text-gray-900 mb-1">
                {index + 1}. {question.title}
                {question.is_required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {question.description && (
                <p className="text-sm text-gray-400 mb-3">{question.description}</p>
              )}

              <div className="mt-3">
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
            </div>
          ))}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {survey.payment_enabled && survey.payment_amount > 0 ? (
              <>
                <CreditCard className="w-5 h-5" />
                回答して決済へ進む（¥{survey.payment_amount.toLocaleString()}）
              </>
            ) : "回答を送信する"}
          </button>
        </form>
      </div>
    </div>
  );
}
