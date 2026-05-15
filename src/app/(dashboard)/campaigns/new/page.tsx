"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, Users, Tag, ClipboardList, FileText } from "lucide-react";
import { cn, SURVEY_CATEGORY_LABELS } from "@/lib/utils";
import { getTagsForOrg, getSurveysForOrg, createCampaignAction, getCustomersByTarget, getTemplatesForOrg } from "./actions";

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<any[]>([]);
  const [surveysList, setSurveysList] = useState<{ id: string; title: string; category: string; responseCount: number }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; subject: string; previewText: string | null; bodyHtml: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [previewCustomers, setPreviewCustomers] = useState<
    { id: string; fullName: string | null; email: string; tags: { name: string; color: string }[] }[]
  >([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    preview_text: "",
    body_html: "",
    target_type: "all",
    target_tag_ids: [] as string[],
    target_survey_id: "",
    scheduled_at: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const [tagsData, surveysData, templatesData] = await Promise.all([
        getTagsForOrg(),
        getSurveysForOrg(),
        getTemplatesForOrg(),
      ]);
      setTags(tagsData);
      setSurveysList(surveysData);
      setTemplates(templatesData);

      // クエリパラメータでテンプレートIDが指定されている場合、自動適用
      const templateId = searchParams.get("template");
      if (templateId) {
        const tmpl = templatesData.find((t) => t.id === templateId);
        if (tmpl) {
          setSelectedTemplateId(tmpl.id);
          setForm((prev) => ({
            ...prev,
            subject: tmpl.subject,
            preview_text: tmpl.previewText ?? "",
            body_html: tmpl.bodyHtml,
          }));
        }
      }
    };
    fetchData();
  }, [searchParams]);

  useEffect(() => {
    const fetchPreview = async () => {
      if (form.target_type === "tag" && form.target_tag_ids.length === 0) {
        setPreviewCustomers([]);
        setPreviewTotal(0);
        return;
      }
      if (form.target_type === "survey_respondents" && !form.target_survey_id) {
        setPreviewCustomers([]);
        setPreviewTotal(0);
        return;
      }
      setPreviewLoading(true);
      try {
        const result = await getCustomersByTarget(form.target_type, form.target_tag_ids, form.target_survey_id);
        setPreviewCustomers(result.customers);
        setPreviewTotal(result.total);
      } catch {
        setPreviewCustomers([]);
        setPreviewTotal(0);
      } finally {
        setPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [form.target_type, form.target_tag_ids, form.target_survey_id]);

  const toggleTagSelection = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      target_tag_ids: prev.target_tag_ids.includes(tagId)
        ? prev.target_tag_ids.filter((id) => id !== tagId)
        : [...prev.target_tag_ids, tagId],
    }));
  };

  const handleSubmit = async (status: "draft" | "scheduled") => {
    if (!form.title || !form.subject || !form.body_html) {
      setError("タイトル・件名・本文は必須です");
      return;
    }
    setLoading(true);
    setError("");

    const result = await createCampaignAction({ ...form, status });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.campaignId) {
      router.push(`/campaigns/${result.campaignId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">メルマガを作成</h1>
          <p className="text-sm text-gray-500">配信するメールの内容を作成してください</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* テンプレート選択 */}
        {templates.length > 0 && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <h2 className="font-semibold text-amber-900">テンプレートから作成</h2>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  const tmplId = e.target.value;
                  setSelectedTemplateId(tmplId);
                  if (tmplId) {
                    const tmpl = templates.find((t) => t.id === tmplId);
                    if (tmpl) {
                      setForm((prev) => ({
                        ...prev,
                        subject: tmpl.subject,
                        preview_text: tmpl.previewText ?? "",
                        body_html: tmpl.bodyHtml,
                      }));
                    }
                  }
                }}
                className="flex-1 px-4 py-3 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-sm"
              >
                <option value="">テンプレートを選択...</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-amber-600">テンプレートを選択すると件名・プレビューテキスト・本文が自動入力されます</p>
          </div>
        )}

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">基本情報</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              キャンペーン名（内部管理用）<span className="text-red-500"> *</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="例：2024年10月セミナーフォローアップ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              メール件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="例：先日のセミナーについて、追加情報をお届けします"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              プレビューテキスト
            </label>
            <input
              type="text"
              value={form.preview_text}
              onChange={(e) => setForm({ ...form, preview_text: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="メール一覧に表示される短いテキスト"
            />
          </div>
        </div>

        {/* Email body */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">メール本文</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              本文（HTML） <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.body_html}
              onChange={(e) => setForm({ ...form, body_html: e.target.value })}
              rows={12}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm resize-none"
              placeholder={`<h1>こんにちは！</h1>\n<p>先日はセミナーにご参加いただきありがとうございました。</p>\n<p>...</p>`}
            />
            <p className="text-xs text-gray-400 mt-1">HTMLまたはテキストで本文を入力してください</p>
          </div>
        </div>

        {/* Target audience */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">配信対象</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "all", label: "全顧客", icon: <Users className="w-4 h-4" />, desc: "全員に配信" },
              { value: "tag", label: "タグ指定", icon: <Tag className="w-4 h-4" />, desc: "タグで絞り込み" },
              { value: "survey_respondents", label: "アンケート回答者", icon: <ClipboardList className="w-4 h-4" />, desc: "回答者に配信" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setForm({ ...form, target_type: option.value })}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium",
                  form.target_type === option.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                )}
              >
                {option.icon}
                <span>{option.label}</span>
                <span className="text-xs text-gray-400 font-normal">{option.desc}</span>
              </button>
            ))}
          </div>

          {form.target_type === "tag" && tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">配信するタグを選択</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagSelection(tag.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      form.target_tag_ids.includes(tag.id)
                        ? "border-transparent text-white"
                        : "border-gray-200 text-gray-600"
                    )}
                    style={
                      form.target_tag_ids.includes(tag.id)
                        ? { backgroundColor: tag.color }
                        : {}
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: form.target_tag_ids.includes(tag.id) ? "white" : tag.color }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.target_type === "survey_respondents" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">配信対象のアンケートを選択</label>
              <select
                value={form.target_survey_id}
                onChange={(e) => setForm({ ...form, target_survey_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">アンケートを選択してください</option>
                {surveysList.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}（{SURVEY_CATEGORY_LABELS[survey.category] || survey.category}・{survey.responseCount}件の回答）
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 顧客プレビュー */}
          {(form.target_type === "all" || (form.target_type === "tag" && form.target_tag_ids.length > 0) || (form.target_type === "survey_respondents" && form.target_survey_id)) && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-700">
                    配信対象: <span className="text-indigo-600 font-semibold">{previewTotal}名</span>
                  </span>
                </div>
                {previewLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>
              {previewCustomers.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs">
                        <th className="text-left px-4 py-2 font-medium">名前</th>
                        <th className="text-left px-4 py-2 font-medium">メールアドレス</th>
                        <th className="text-left px-4 py-2 font-medium">タグ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewCustomers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900">
                            {customer.fullName || <span className="text-gray-400">未設定</span>}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{customer.email}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {customer.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewTotal > 50 && (
                    <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t border-gray-100">
                      他 {previewTotal - 50}名
                    </div>
                  )}
                </div>
              )}
              {!previewLoading && previewCustomers.length === 0 && (
                <p className="text-sm text-gray-400">対象の顧客が見つかりません</p>
              )}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">配信タイミング</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              予約配信日時（空白の場合は今すぐ配信）
            </label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/campaigns"
          className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </Link>
        <button
          onClick={() => handleSubmit("draft")}
          disabled={loading}
          className="flex-1 py-3 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50"
        >
          下書き保存
        </button>
        <button
          onClick={() => handleSubmit("scheduled")}
          disabled={loading}
          className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          <Mail className="w-4 h-4" />
          {form.scheduled_at ? "予約する" : "今すぐ配信"}
        </button>
      </div>
    </div>
  );
}
