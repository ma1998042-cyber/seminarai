"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Users,
  Tag,
  ClipboardList,
  Send,
  Eye,
  MousePointer,
  Trash2,
  XCircle,
  Clock,
  Save,
  AlertTriangle,
} from "lucide-react";
import { cn, formatDate, formatDateTime, SURVEY_CATEGORY_LABELS } from "@/lib/utils";
import { VariableInsertButton } from "@/components/campaigns/VariableInsertButton";
import {
  getCampaignDetail,
  getTagsForOrg,
  getSurveysForOrg,
  updateCampaignAction,
  deleteCampaignAction,
  cancelCampaignAction,
  getCustomersByTarget,
  getCampaignRecipients,
} from "./actions";

type Campaign = NonNullable<Awaited<ReturnType<typeof getCampaignDetail>>>;

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-green-100 text-green-700",
  canceled: "bg-red-100 text-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "下書き",
  scheduled: "予約済み",
  sending: "送信中",
  sent: "送信済み",
  canceled: "キャンセル",
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [surveysList, setSurveysList] = useState<{ id: string; title: string; category: string; responseCount: number }[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  // 配信対象プレビュー（編集時）
  const [previewCustomers, setPreviewCustomers] = useState<
    { id: string; fullName: string | null; email: string; tags: { name: string; color: string }[] }[]
  >([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 送信済み受信者リスト
  const [sentRecipients, setSentRecipients] = useState<
    { email: string; fullName: string | null; status: string; sentAt: string | null }[]
  >([]);
  const [sentRecipientsTotal, setSentRecipientsTotal] = useState(0);

  const [fetchError, setFetchError] = useState(false);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  const isEditable = campaign?.status === "draft" || campaign?.status === "scheduled";
  const isReadOnly = campaign?.status === "sent" || campaign?.status === "canceled";

  const fetchData = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const [campaignData, tagsData, surveysData] = await Promise.all([
        getCampaignDetail(id),
        getTagsForOrg(),
        getSurveysForOrg(),
      ]);

      if (!campaignData) {
        router.replace("/campaigns");
        return;
      }

      setCampaign(campaignData);
      setTags(tagsData);
      setSurveysList(surveysData);
      setForm({
        title: campaignData.title,
        subject: campaignData.subject,
        preview_text: campaignData.previewText ?? "",
        body_html: campaignData.bodyHtml,
        target_type: campaignData.targetType,
        target_tag_ids: campaignData.targetTagIds ?? [],
        target_survey_id: campaignData.targetSurveyId ?? "",
        scheduled_at: campaignData.scheduledAt ?? "",
      });
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, router]);

  // 編集時: 配信対象プレビューを取得
  useEffect(() => {
    if (!isEditable) return;
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
    getCustomersByTarget(form.target_type, form.target_tag_ids, form.target_survey_id)
      .then((result) => {
        setPreviewCustomers(result.customers);
        setPreviewTotal(result.total);
      })
      .catch(() => {
        setPreviewCustomers([]);
        setPreviewTotal(0);
      })
      .finally(() => setPreviewLoading(false));
  }, [isEditable, form.target_type, form.target_tag_ids, form.target_survey_id]);

  // 送信済み: 受信者リストを取得
  useEffect(() => {
    if (campaign?.status !== "sent") return;
    getCampaignRecipients(id).then((result) => {
      setSentRecipients(result.recipients);
      setSentRecipientsTotal(result.total);
    });
  }, [campaign?.status, id]);

  const toggleTagSelection = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      target_tag_ids: prev.target_tag_ids.includes(tagId)
        ? prev.target_tag_ids.filter((tid) => tid !== tagId)
        : [...prev.target_tag_ids, tagId],
    }));
  };

  const handleUpdate = async (action: "save" | "schedule" | "send") => {
    if (!form.title || !form.subject || !form.body_html) {
      setError("タイトル・件名・本文は必須です");
      return;
    }
    setActionLoading(true);
    setError("");

    const result = await updateCampaignAction(id, { ...form, action });

    if (result.error) {
      setError(result.error);
      setActionLoading(false);
      return;
    }

    // リロードして最新状態を取得
    const updated = await getCampaignDetail(id);
    if (updated) {
      setCampaign(updated);
      setForm({
        title: updated.title,
        subject: updated.subject,
        preview_text: updated.previewText ?? "",
        body_html: updated.bodyHtml,
        target_type: updated.targetType,
        target_tag_ids: updated.targetTagIds ?? [],
        target_survey_id: updated.targetSurveyId ?? "",
        scheduled_at: updated.scheduledAt ?? "",
      });
    }
    setActionLoading(false);
    setConfirmSend(false);
  };

  const handleDelete = async () => {
    setActionLoading(true);
    setError("");
    const result = await deleteCampaignAction(id);
    if (result.error) {
      setError(result.error);
      setActionLoading(false);
      return;
    }
    router.push("/campaigns");
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setError("");
    const result = await cancelCampaignAction(id);
    if (result.error) {
      setError(result.error);
      setActionLoading(false);
      return;
    }
    const updated = await getCampaignDetail(id);
    if (updated) {
      setCampaign(updated);
    }
    setActionLoading(false);
    setConfirmCancel(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-400" />
        <p className="text-sm text-gray-600">データの読み込みに失敗しました。再読み込みしてください。</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          再読み込み
        </button>
      </div>
    );
  }

  if (!campaign) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/campaigns" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                statusColors[campaign.status] || statusColors.draft
              )}
            >
              {statusLabels[campaign.status] || campaign.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">{campaign.subject}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 送信済み統計 */}
      {campaign.status === "sent" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">配信統計</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Send className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{campaign.sentCount}</p>
              <p className="text-xs text-gray-500">送信数</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <Eye className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">
                {campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500">開封率（{campaign.openCount}件）</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <MousePointer className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">
                {campaign.sentCount > 0 ? Math.round((campaign.clickCount / campaign.sentCount) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-500">クリック率（{campaign.clickCount}件）</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900">{campaign.bounceCount}</p>
              <p className="text-xs text-gray-500">バウンス</p>
            </div>
          </div>
          {campaign.sentAt && (
            <p className="text-xs text-gray-400 mt-4">送信日時: {formatDateTime(campaign.sentAt)}</p>
          )}
        </div>
      )}

      {/* 送信先リスト（送信済み） */}
      {campaign.status === "sent" && sentRecipients.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">送信先一覧</h2>
            <span className="text-sm text-gray-500">{sentRecipientsTotal}名</span>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-2 font-medium">名前</th>
                  <th className="text-left px-4 py-2 font-medium">メールアドレス</th>
                  <th className="text-left px-4 py-2 font-medium">ステータス</th>
                  <th className="text-left px-4 py-2 font-medium">送信日時</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sentRecipients.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">
                      {r.fullName || <span className="text-gray-400">未設定</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.email}</td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          r.status === "sent"
                            ? "bg-green-100 text-green-700"
                            : r.status === "failed"
                            ? "bg-red-100 text-red-600"
                            : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {r.status === "sent" ? "送信済み" : r.status === "failed" ? "失敗" : "保留中"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {r.sentAt ? formatDateTime(r.sentAt) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sentRecipientsTotal > 100 && (
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t border-gray-100">
                他 {sentRecipientsTotal - 100}名
              </div>
            )}
          </div>
        </div>
      )}

      {/* 基本情報 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">基本情報</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            キャンペーン名（内部管理用）<span className="text-red-500"> *</span>
          </label>
          {isEditable ? (
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="例：2024年10月セミナーフォローアップ"
            />
          ) : (
            <p className="text-gray-900">{campaign.title}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            メール件名 <span className="text-red-500">*</span>
          </label>
          {isEditable ? (
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="例：先日のセミナーについて、追加情報をお届けします"
            />
          ) : (
            <p className="text-gray-900">{campaign.subject}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            プレビューテキスト
          </label>
          {isEditable ? (
            <input
              type="text"
              value={form.preview_text}
              onChange={(e) => setForm({ ...form, preview_text: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="メール一覧に表示される短いテキスト"
            />
          ) : (
            <p className="text-gray-600">{campaign.previewText || <span className="text-gray-400">未設定</span>}</p>
          )}
        </div>
      </div>

      {/* メール本文 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">メール本文</h2>
        <div>
          {isEditable ? (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  本文（HTML） <span className="text-red-500">*</span>
                </label>
                <VariableInsertButton
                  textareaRef={bodyTextareaRef}
                  onInsert={(newValue) => setForm({ ...form, body_html: newValue })}
                />
              </div>
              <textarea
                ref={bodyTextareaRef}
                value={form.body_html}
                onChange={(e) => setForm({ ...form, body_html: e.target.value })}
                rows={12}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm resize-none"
                placeholder={`<h1>こんにちは！</h1>\n<p>先日はセミナーにご参加いただきありがとうございました。</p>`}
              />
              <p className="text-xs text-gray-400 mt-1">HTMLまたはテキストで本文を入力してください。差し込み変数が使えます。</p>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                本文（HTML） <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(campaign.bodyHtml) }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 配信対象 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">配信対象</h2>
        {isEditable ? (
          <>
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

            {/* 配信対象プレビュー */}
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
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-700">
            {campaign.targetType === "all" && (
              <>
                <Users className="w-4 h-4 text-indigo-500" />
                <span>全顧客</span>
              </>
            )}
            {campaign.targetType === "tag" && (
              <>
                <Tag className="w-4 h-4 text-indigo-500" />
                <span>タグ指定: </span>
                <div className="flex flex-wrap gap-1">
                  {campaign.targetTagNames.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </>
            )}
            {campaign.targetType === "survey_respondents" && (
              <>
                <ClipboardList className="w-4 h-4 text-indigo-500" />
                <span>アンケート回答者: {campaign.targetSurveyName || "不明"}</span>
              </>
            )}
            {campaign.status === "sent" && campaign.totalRecipients > 0 && (
              <span className="text-gray-400 ml-2">（{campaign.totalRecipients}名）</span>
            )}
          </div>
        )}
      </div>

      {/* 配信タイミング（編集可能時のみ） */}
      {isEditable && (
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
      )}

      {/* 予約情報（読み取り専用で予約日時がある場合） */}
      {isReadOnly && campaign.scheduledAt && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>予約配信日時: {formatDateTime(campaign.scheduledAt)}</span>
          </div>
        </div>
      )}

      {/* メタ情報 */}
      <div className="text-xs text-gray-400 flex gap-4">
        <span>作成日: {formatDate(campaign.createdAt)}</span>
        <span>更新日: {formatDate(campaign.updatedAt)}</span>
      </div>

      {/* アクションボタン */}
      {campaign.status === "draft" && (
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={actionLoading}
            className="py-3 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <Link
            href="/campaigns"
            className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            戻る
          </Link>
          <button
            onClick={() => handleUpdate("save")}
            disabled={actionLoading}
            className="flex-1 py-3 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            下書き保存
          </button>
          <button
            onClick={() => {
              if (form.scheduled_at) {
                handleUpdate("schedule");
              } else {
                setConfirmSend(true);
              }
            }}
            disabled={actionLoading}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Mail className="w-4 h-4" />
            {form.scheduled_at ? "予約する" : "今すぐ配信"}
          </button>
        </div>
      )}

      {campaign.status === "scheduled" && (
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmCancel(true)}
            disabled={actionLoading}
            className="py-3 px-4 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            予約キャンセル
          </button>
          <Link
            href="/campaigns"
            className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            戻る
          </Link>
          <button
            onClick={() => handleUpdate("save")}
            disabled={actionLoading}
            className="flex-1 py-3 rounded-lg border border-indigo-200 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            下書きに戻す
          </button>
          <button
            onClick={() => handleUpdate("schedule")}
            disabled={actionLoading}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Clock className="w-4 h-4" />
            予約更新
          </button>
        </div>
      )}

      {campaign.status === "sent" && (
        <div className="flex gap-3">
          <Link
            href="/campaigns"
            className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            一覧に戻る
          </Link>
        </div>
      )}

      {campaign.status === "canceled" && (
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={actionLoading}
            className="py-3 px-6 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            削除
          </button>
          <Link
            href="/campaigns"
            className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            一覧に戻る
          </Link>
        </div>
      )}

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">キャンペーンを削除</h3>
                <p className="text-sm text-gray-500">この操作は取り消せません</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 予約キャンセル確認モーダル */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <XCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">予約をキャンセル</h3>
                <p className="text-sm text-gray-500">予約配信をキャンセルしますか？</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmCancel(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                キャンセルする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 即時送信確認モーダル */}
      {confirmSend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Send className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">今すぐ配信</h3>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-indigo-600">{previewTotal}名</span>にメールを即時送信します。この操作は取り消せません。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmSend(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => handleUpdate("send")}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                送信する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
