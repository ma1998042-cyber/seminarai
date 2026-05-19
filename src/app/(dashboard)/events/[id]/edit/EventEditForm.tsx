"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, ImagePlus, X, AlertTriangle, Bell } from "lucide-react";
import { updateEventAction, updateSurveyPublicAction } from "./actions";

const MAX_IMAGES = 3;

const eventTypes = [
  { value: "seminar", label: "セミナー" },
  { value: "webinar", label: "ウェビナー" },
  { value: "workshop", label: "ワークショップ" },
  { value: "course", label: "講座" },
  { value: "other", label: "その他" },
];

type EventData = {
  id: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  isOnline: boolean;
  onlineUrl: string | null;
  capacity: number | null;
  status: string;
  visibility: string;
  thumbnailUrl: string | null;
  imageUrls: string[];
  showRemainingCapacity: number;
  participationRequirements: string | null;
  recommendedFor: string | null;
  participationBenefits: string | null;
  registrationDeadline: string | null;
  reminderEnabled: number;
  reminderDays: string;
  reminderSubject: string | null;
  reminderBody: string | null;
};

type SurveyItem = {
  id: string;
  title: string;
  category: string;
  isPublic: boolean;
};

export default function EventEditForm({ event, hasRegistrationSurvey, eventSurveys }: { event: EventData; hasRegistrationSurvey: boolean; eventSurveys: SurveyItem[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(
    event.imageUrls.length > 0
      ? event.imageUrls
      : event.thumbnailUrl
        ? [event.thumbnailUrl]
        : []
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: event.title,
    description: event.description || "",
    event_type: event.eventType,
    start_date: event.startDate || "",
    end_date: event.endDate || "",
    location: event.location || "",
    is_online: event.isOnline,
    online_url: event.onlineUrl || "",
    capacity: event.capacity?.toString() || "",
    status: event.status,
    visibility: event.visibility,
    show_remaining_capacity: event.showRemainingCapacity === 1,
    participation_requirements: event.participationRequirements || "",
    recommended_for: event.recommendedFor || "",
    participation_benefits: event.participationBenefits || "",
    registration_deadline: event.registrationDeadline || "",
    reminder_enabled: event.reminderEnabled === 1,
    reminder_days: (() => {
      try {
        return JSON.parse(event.reminderDays || '[1,3]') as number[];
      } catch {
        return [1, 3];
      }
    })(),
    reminder_subject: event.reminderSubject || "",
    reminder_body: event.reminderBody || "",
  });

  const [reminderDayInput, setReminderDayInput] = useState("");
  const reminderBodyRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = useCallback((placeholder: string) => {
    const textarea = reminderBodyRef.current;
    if (!textarea) {
      setForm((prev) => ({ ...prev, reminder_body: prev.reminder_body + placeholder }));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = form.reminder_body;
    const newValue = current.substring(0, start) + placeholder + current.substring(end);
    setForm((prev) => ({ ...prev, reminder_body: newValue }));
    // カーソル位置を挿入後に移動
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
    }, 0);
  }, [form.reminder_body]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imageUrls.length >= MAX_IMAGES) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "アップロードに失敗しました");
      setImageUrls((prev) => [...prev, `/api/images/${data.key}`]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.visibility === "public" && !form.start_date) {
      setError("一般公開するには開催日時を設定してください");
      setLoading(false);
      return;
    }

    const result = await updateEventAction(event.id, {
      ...form,
      thumbnail_url: imageUrls[0] || "",
      image_urls: imageUrls,
      show_remaining_capacity: form.show_remaining_capacity,
      participation_requirements: form.participation_requirements,
      recommended_for: form.recommended_for,
      participation_benefits: form.participation_benefits,
      registration_deadline: form.registration_deadline,
      reminder_enabled: form.reminder_enabled,
      reminder_days: form.reminder_days,
      reminder_subject: form.reminder_subject,
      reminder_body: form.reminder_body,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/events/${event.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/events/${event.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">イベントを編集</h1>
          <p className="text-sm text-gray-500">{event.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            イベント名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">イベント概要</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="イベントの概要・詳細を入力してください"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">こんな人におすすめ</label>
          <textarea
            value={form.recommended_for}
            onChange={(e) => setForm({ ...form, recommended_for: e.target.value })}
            rows={2}
            placeholder="例: マーケティング初心者の方、集客に悩んでいる方"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">参加条件</label>
          <textarea
            value={form.participation_requirements}
            onChange={(e) => setForm({ ...form, participation_requirements: e.target.value })}
            rows={2}
            placeholder="例: PC持参必須、Python基礎知識がある方"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">参加特典</label>
          <textarea
            value={form.participation_benefits}
            onChange={(e) => setForm({ ...form, participation_benefits: e.target.value })}
            rows={2}
            placeholder="例: セミナー資料プレゼント、個別相談会への参加権"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            イベント画像（最大{MAX_IMAGES}枚）
          </label>
          <div className="grid grid-cols-3 gap-3">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                <img src={url} alt={`イベント画像 ${index + 1}`} className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded">
                    メイン
                  </span>
                )}
              </div>
            ))}
            {imageUrls.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-video rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-indigo-500 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">追加</span>
                  </>
                )}
              </button>
            )}
          </div>
          {imageUrls.length === 0 && (
            <p className="mt-1.5 text-xs text-gray-400">JPEG, PNG, WebP, GIF（5MB以下）</p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">イベントタイプ</label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setForm({ ...form, event_type: type.value })}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  form.event_type === type.value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">開催日時</label>
            <input
              type="datetime-local"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">終了日時</label>
            <input
              type="datetime-local"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">申し込み期限</label>
          <input
            type="datetime-local"
            value={form.registration_deadline}
            onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          <p className="mt-1 text-xs text-gray-400">設定すると、期限を過ぎた場合に申し込みフォームが非表示になります</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">開催形式</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, is_online: false })}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                !form.is_online ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
              }`}
            >
              オフライン
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_online: true })}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                form.is_online ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
              }`}
            >
              オンライン
            </button>
          </div>
        </div>

        {form.is_online ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">開催URL</label>
            <input
              type="url"
              value={form.online_url}
              onChange={(e) => setForm({ ...form, online_url: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="https://zoom.us/j/..."
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">会場</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">定員</label>
          <input
            type="number"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            min="1"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">残席数を公開ページに表示する</p>
            <p className="text-xs text-gray-400 mt-0.5">定員に対する残席数を参加者に公開します</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.show_remaining_capacity}
            onClick={() => setForm({ ...form, show_remaining_capacity: !form.show_remaining_capacity })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.show_remaining_capacity ? "bg-indigo-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.show_remaining_capacity ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">公開ステータス</label>
          <div className="flex gap-3">
            {[
              { value: "draft", label: "下書き" },
              { value: "active", label: "公開中" },
              { value: "closed", label: "終了" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm({ ...form, status: s.value })}
                className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                  form.status === s.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">公開設定</label>
          <div className="flex gap-3">
            {[
              { value: "draft", label: "下書き" },
              { value: "unlisted", label: "限定公開" },
              { value: "public", label: "一般公開" },
            ].map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setForm({ ...form, visibility: v.value })}
                className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${
                  form.visibility === v.value ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
          {!hasRegistrationSurvey && (form.visibility === "public" || form.visibility === "unlisted") && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>申し込みアンケート（registration）が未設定のため、公開ページで申し込みフォームが表示されません。</span>
            </div>
          )}
        </div>

        {/* リマインドメール設定 */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between py-3 px-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">リマインドメール</p>
                <p className="text-xs text-gray-400 mt-0.5">イベント開催前に参加者へ自動でリマインドメールを送信します</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.reminder_enabled}
              onClick={() => setForm({ ...form, reminder_enabled: !form.reminder_enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.reminder_enabled ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.reminder_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {form.reminder_enabled && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">送信タイミング（開催日の何日前）</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.reminder_days
                    .sort((a, b) => a - b)
                    .map((day) => (
                      <span
                        key={day}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full"
                      >
                        {day}日前
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              reminder_days: form.reminder_days.filter((d) => d !== day),
                            })
                          }
                          className="ml-0.5 hover:text-indigo-900"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={reminderDayInput}
                    onChange={(e) => setReminderDayInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = parseInt(reminderDayInput);
                        if (val > 0 && val <= 90 && !form.reminder_days.includes(val)) {
                          setForm({ ...form, reminder_days: [...form.reminder_days, val] });
                          setReminderDayInput("");
                        }
                      }
                    }}
                    placeholder="日数を入力"
                    className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseInt(reminderDayInput);
                      if (val > 0 && val <= 90 && !form.reminder_days.includes(val)) {
                        setForm({ ...form, reminder_days: [...form.reminder_days, val] });
                        setReminderDayInput("");
                      }
                    }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    追加
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-400">1〜90日前まで設定できます</p>
              </div>

              {/* メールテンプレート編集 */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">メール件名</label>
                <input
                  type="text"
                  value={form.reminder_subject}
                  onChange={(e) => setForm({ ...form, reminder_subject: e.target.value })}
                  placeholder="【リマインド】{{イベント名}} 開催まであと{{残り日数}}日"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">メール本文</label>
                <textarea
                  ref={reminderBodyRef}
                  value={form.reminder_body}
                  onChange={(e) => setForm({ ...form, reminder_body: e.target.value })}
                  rows={6}
                  placeholder={"{{参加者名}} 様\n\nご登録いただいた「{{イベント名}}」の開催まであと{{残り日数}}日となりました。\n\n日時: {{開催日時}}\n場所: {{場所}}\n\nご参加をお待ちしております。"}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">利用可能なプレースホルダ（クリックで挿入）</p>
                <div className="flex flex-wrap gap-1.5">
                  {["{{参加者名}}", "{{イベント名}}", "{{開催日時}}", "{{場所}}", "{{残り日数}}"].map((ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => insertPlaceholder(ph)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 rounded border border-gray-200 hover:border-indigo-200 transition-colors"
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-400">未入力の場合はデフォルトテンプレートが使用されます</p>
            </div>
          )}
        </div>

        {/* アンケート公開設定 */}
        {eventSurveys.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="py-3 px-4">
              <p className="text-sm font-medium text-gray-700">公開ページに表示するアンケート</p>
              <p className="text-xs text-gray-400 mt-0.5">公開ページで表示するアンケートを選択します</p>
            </div>
            <div className="px-4 pb-4 space-y-2">
              {eventSurveys.map((survey) => (
                <SurveyPublicToggle key={survey.id} survey={survey} />
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href={`/events/${event.id}`}
            className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium text-center hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading || !form.title.trim()}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            保存する
          </button>
        </div>
      </form>
    </div>
  );
}

function SurveyPublicToggle({ survey }: { survey: SurveyItem }) {
  const [isPublic, setIsPublic] = useState(survey.isPublic);
  const [updating, setUpdating] = useState(false);

  const handleToggle = async () => {
    const newValue = !isPublic;
    setIsPublic(newValue);
    setUpdating(true);
    try {
      await updateSurveyPublicAction(survey.id, newValue);
    } catch {
      setIsPublic(!newValue);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 border border-gray-100 rounded-lg">
      <div>
        <p className="text-sm text-gray-700">{survey.title}</p>
        <p className="text-xs text-gray-400">{survey.category}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        disabled={updating}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          isPublic ? "bg-indigo-600" : "bg-gray-200"
        } ${updating ? "opacity-50" : ""}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isPublic ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
