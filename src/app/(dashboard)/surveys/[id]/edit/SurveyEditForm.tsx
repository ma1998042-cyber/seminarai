"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, GripVertical, Loader2, ClipboardList,
  Type, AlignLeft, CheckSquare, Circle, ChevronDown, Star, Hash, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateSurvey } from "./actions";

type QuestionType = "text" | "textarea" | "radio" | "checkbox" | "select" | "rating" | "number" | "email";

interface Question {
  id: string;
  question_type: QuestionType;
  title: string;
  description: string;
  is_required: boolean;
  options: string[];
  sort_order: number;
}

const questionTypes: { value: QuestionType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "テキスト（短文）", icon: <Type className="w-4 h-4" /> },
  { value: "textarea", label: "テキスト（長文）", icon: <AlignLeft className="w-4 h-4" /> },
  { value: "radio", label: "単一選択", icon: <Circle className="w-4 h-4" /> },
  { value: "checkbox", label: "複数選択", icon: <CheckSquare className="w-4 h-4" /> },
  { value: "select", label: "ドロップダウン", icon: <ChevronDown className="w-4 h-4" /> },
  { value: "rating", label: "評価（星）", icon: <Star className="w-4 h-4" /> },
  { value: "number", label: "数値", icon: <Hash className="w-4 h-4" /> },
  { value: "email", label: "メールアドレス", icon: <Type className="w-4 h-4" /> },
];

type InitialData = {
  title: string;
  description: string;
  thank_you_message: string;
  status: string;
  payment_enabled: boolean;
  payment_amount: number;
  questions: Question[];
};

export default function SurveyEditForm({ surveyId, initial }: { surveyId: string; initial: InitialData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [thankYouMessage, setThankYouMessage] = useState(initial.thank_you_message);
  const [paymentEnabled, setPaymentEnabled] = useState(initial.payment_enabled);
  const [paymentAmount, setPaymentAmount] = useState(initial.payment_amount ? String(initial.payment_amount) : "");
  const [questions, setQuestions] = useState<Question[]>(initial.questions);
  const [selectedType, setSelectedType] = useState<QuestionType>("text");

  const createQuestion = (type: QuestionType): Question => ({
    id: Math.random().toString(36).substr(2, 9),
    question_type: type,
    title: "",
    description: "",
    is_required: false,
    options: ["radio", "checkbox", "select"].includes(type) ? ["選択肢1", "選択肢2"] : [],
    sort_order: questions.length,
  });

  const removeQuestion = (id: string) => setQuestions(questions.filter((q) => q.id !== id));
  const updateQuestion = (id: string, updates: Partial<Question>) =>
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  const addOption = (qId: string) =>
    setQuestions(questions.map((q) => q.id === qId ? { ...q, options: [...q.options, `選択肢${q.options.length + 1}`] } : q));
  const updateOption = (qId: string, i: number, val: string) =>
    setQuestions(questions.map((q) => q.id === qId ? { ...q, options: q.options.map((o, j) => (j === i ? val : o)) } : q));
  const removeOption = (qId: string, i: number) =>
    setQuestions(questions.map((q) => q.id === qId ? { ...q, options: q.options.filter((_, j) => j !== i) } : q));

  const handleSubmit = async (status: "draft" | "active" | "closed") => {
    if (!title.trim() || questions.length === 0) {
      setError("タイトルと少なくとも1つの設問を入力してください");
      return;
    }
    setLoading(true);
    setError("");

    const result = await updateSurvey(surveyId, {
      title,
      description: description || undefined,
      thank_you_message: thankYouMessage,
      status,
      questions: questions.map((q, i) => ({ ...q, sort_order: i })),
      payment_enabled: paymentEnabled,
      payment_amount: paymentEnabled && paymentAmount ? parseInt(paymentAmount) : 0,
    });

    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push(`/surveys/${surveyId}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/surveys/${surveyId}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">アンケートを編集</h1>
          <p className="text-sm text-gray-500">設問や設定を変更してください</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">基本情報</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">アンケートタイトル <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">説明文</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">回答後のメッセージ</label>
          <input type="text" value={thankYouMessage} onChange={(e) => setThankYouMessage(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">参加費決済（Stripe）</span>
            </div>
            <button
              type="button"
              onClick={() => setPaymentEnabled(!paymentEnabled)}
              className={cn("relative w-11 h-6 rounded-full transition-colors", paymentEnabled ? "bg-indigo-600" : "bg-gray-200")}
            >
              <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", paymentEnabled ? "translate-x-5" : "translate-x-0")} />
            </button>
          </div>
          {paymentEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">参加費金額（円）</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  min="50"
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="3000"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">回答送信後にStripe決済画面へ遷移します</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300" />
                <span className="text-sm font-medium text-gray-500">設問 {index + 1}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  {questionTypes.find((t) => t.value === question.question_type)?.label}
                </span>
              </div>
              <button onClick={() => removeQuestion(question.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input type="text" value={question.title} onChange={(e) => updateQuestion(question.id, { title: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium" placeholder="設問のタイトルを入力してください" />
              {["radio", "checkbox", "select"].includes(question.question_type) && (
                <div className="space-y-2 pl-4">
                  {question.options.map((option, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex-shrink-0" />
                      <input type="text" value={option} onChange={(e) => updateOption(question.id, i, e.target.value)} className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button onClick={() => removeOption(question.id, i)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  <button onClick={() => addOption(question.id)} className="text-sm text-indigo-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" />選択肢を追加</button>
                </div>
              )}
              {question.question_type === "rating" && (
                <div className="flex items-center gap-2 pl-4">
                  {[1,2,3,4,5].map((n) => <Star key={n} className="w-6 h-6 text-amber-400 fill-amber-400" />)}
                  <span className="text-sm text-gray-400 ml-2">5段階評価</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input type="checkbox" id={`req-${question.id}`} checked={question.is_required} onChange={(e) => updateQuestion(question.id, { is_required: e.target.checked })} className="w-4 h-4 text-indigo-600 rounded" />
                <label htmlFor={`req-${question.id}`} className="text-sm text-gray-600">必須回答にする</label>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">設問を追加</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {questionTypes.map((type) => (
              <button key={type.value} onClick={() => setSelectedType(type.value)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all", selectedType === type.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300")}>
                {type.icon}{type.label}
              </button>
            ))}
          </div>
          <button onClick={() => setQuestions([...questions, createQuestion(selectedType)])} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />設問を追加する
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href={`/surveys/${surveyId}`} className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors">キャンセル</Link>
        <button onClick={() => handleSubmit("draft")} disabled={loading} className="flex-1 py-3 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors">下書き保存</button>
        <button onClick={() => handleSubmit("active")} disabled={loading} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <ClipboardList className="w-4 h-4" />保存して公開
        </button>
      </div>
    </div>
  );
}
