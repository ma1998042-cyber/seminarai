"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Building2, CalendarDays, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { createOrganization, createEvent, completeOnboarding } from "./actions";

const steps = [
  { id: 1, title: "組織を作成", desc: "まずあなたのビジネス情報を入力してください" },
  { id: 2, title: "最初のイベントを作成", desc: "セミナー・ウェビナーの情報を入力してください" },
  { id: 3, title: "準備完了！", desc: "SeminarFlowを使い始めましょう" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState("");

  // Step 1: Organization
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("seminar");

  // Step 2: Event
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("seminar");
  const [skipEvent, setSkipEvent] = useState(false);

  const orgTypes = [
    { value: "seminar", label: "セミナー講師" },
    { value: "webinar", label: "ウェビナー開催者" },
    { value: "consultant", label: "コンサルタント" },
    { value: "school", label: "スクール運営者" },
    { value: "community", label: "コミュニティ運営者" },
    { value: "other", label: "その他" },
  ];

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setLoading(true);
    setError("");

    const result = await createOrganization(orgName, orgType);

    if (result.error || !result.orgId) {
      setError(`組織の作成に失敗しました: ${result.error ?? "不明なエラー"}`);
      setLoading(false);
      return;
    }

    setOrgId(result.orgId);
    setLoading(false);
    setCurrentStep(2);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!skipEvent && eventTitle.trim()) {
      const result = await createEvent(orgId, eventTitle, eventType);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
    }

    await handleCompleteOnboarding();
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    await completeOnboarding();
    setLoading(false);
    setCurrentStep(3);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-gray-900">SeminarFlow</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    currentStep > step.id
                      ? "bg-green-500 text-white"
                      : currentStep === step.id
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {currentStep > step.id ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 w-12 ${currentStep > step.id ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Step 1: Organization */}
          {currentStep === 1 && (
            <form onSubmit={handleCreateOrg} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-indigo-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">{steps[0].title}</h1>
                <p className="text-sm text-gray-500 mt-1">{steps[0].desc}</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  組織名・ビジネス名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="例：山田太郎コンサルティング"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ビジネスタイプ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {orgTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setOrgType(type.value)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${
                        orgType === type.value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !orgName.trim()}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                次へ進む
              </button>
            </form>
          )}

          {/* Step 2: Event */}
          {currentStep === 2 && (
            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CalendarDays className="w-7 h-7 text-green-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">{steps[1].title}</h1>
                <p className="text-sm text-gray-500 mt-1">{steps[1].desc}</p>
              </div>

              {!skipEvent && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      イベント名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      placeholder="例：マーケティング入門セミナー2024"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      イベントタイプ
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "seminar", label: "セミナー" },
                        { value: "webinar", label: "ウェビナー" },
                        { value: "workshop", label: "ワークショップ" },
                        { value: "course", label: "講座" },
                        { value: "other", label: "その他" },
                      ].map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setEventType(type.value)}
                          className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                            eventType === type.value
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setSkipEvent(true); handleCompleteOnboarding(); }}
                  className="flex-1 py-3 rounded-lg font-medium text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  スキップする
                </button>
                <button
                  type="submit"
                  disabled={loading || (!skipEvent && !eventTitle.trim())}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  作成する
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Complete */}
          {currentStep === 3 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-3">セットアップ完了！</h1>
              <p className="text-sm text-gray-500 mb-6">
                SeminarFlowの準備ができました。<br />
                ダッシュボードに移動します...
              </p>
              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
