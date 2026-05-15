"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Loader2, Play, Pause, Mail, Clock, AlertTriangle, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveStep, deleteStep, updateSequenceStatus, deleteSequenceAction, getSequenceData } from "../actions";

type Step = {
  id: string;
  stepNumber: number;
  name: string | null;
  delayDays: number;
  subject: string;
  previewText: string | null;
  bodyHtml: string;
};

type Sequence = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
};

const triggerLabels: Record<string, string> = {
  manual: "手動登録", event_registration: "イベント参加時", tag_added: "タグ追加時",
};
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600", active: "bg-green-100 text-green-700", paused: "bg-amber-100 text-amber-700",
};
const statusLabels: Record<string, string> = {
  draft: "下書き", active: "稼働中", paused: "一時停止",
};

const emptyStep = { step_number: 1, delay_days: 0, subject: "", body_html: "", name: "", preview_text: "" };

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fetchError, setFetchError] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [addingStep, setAddingStep] = useState(false);
  const [newStep, setNewStep] = useState({ ...emptyStep });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStep, setEditStep] = useState({ delay_days: 0, subject: "", body_html: "", name: "", preview_text: "" });

  const fetchData = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const data = await getSequenceData(id);
      setSequence(data.sequence);
      setSteps(data.steps);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddStep = async () => {
    if (!newStep.subject || !newStep.body_html) { setError("件名と本文は必須です"); return; }
    setSaving(true);
    setError("");
    const stepNum = steps.length + 1;
    const { step_number: _, ...restNewStep } = newStep;
    const result = await saveStep({ step_campaign_id: id, step_number: stepNum, ...restNewStep });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    await fetchData();
    setNewStep({ ...emptyStep });
    setAddingStep(false);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("このステップを削除しますか？")) return;
    const result = await deleteStep(stepId);
    if (result.error) { setError(result.error); return; }
    setSteps((s) => s.filter((x) => x.id !== stepId));
  };

  const handleToggleStatus = async () => {
    if (!sequence) return;
    const next = sequence.status === "active" ? "paused" : "active";
    const result = await updateSequenceStatus(id, next);
    if (result.error) { setError(result.error); return; }
    setSequence({ ...sequence, status: next });
  };

  const handleStartEdit = (step: Step) => {
    setEditingStepId(step.id);
    setEditStep({
      delay_days: step.delayDays,
      subject: step.subject,
      body_html: step.bodyHtml,
      name: step.name || "",
      preview_text: step.previewText || "",
    });
    setExpandedStep(step.id);
  };

  const handleCancelEdit = () => {
    setEditingStepId(null);
  };

  const handleSaveEdit = async (step: Step) => {
    if (!editStep.subject || !editStep.body_html) { setError("件名と本文は必須です"); return; }
    setSaving(true);
    setError("");
    const result = await saveStep({
      id: step.id,
      step_campaign_id: id,
      step_number: step.stepNumber,
      name: editStep.name,
      delay_days: editStep.delay_days,
      subject: editStep.subject,
      preview_text: editStep.preview_text,
      body_html: editStep.body_html,
    });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setEditingStepId(null);
    await fetchData();
  };

  const handleDeleteSequence = async () => {
    setDeleting(true);
    setError("");
    const result = await deleteSequenceAction(id);
    if (result.error) {
      setError(result.error);
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }
    router.push("/campaigns/sequences");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
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
  if (!sequence) return <div className="text-center py-20 text-gray-400">シーケンスが見つかりません</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/campaigns/sequences" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{sequence.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[sequence.status] ?? statusColors.draft}`}>
              {statusLabels[sequence.status] ?? sequence.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">トリガー: {triggerLabels[sequence.triggerType] ?? sequence.triggerType}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            削除
          </button>
          <button
            onClick={handleToggleStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sequence.status === "active" ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
          >
            {sequence.status === "active" ? <><Pause className="w-4 h-4" />停止</> : <><Play className="w-4 h-4" />稼働開始</>}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      {/* Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">ステップ一覧</h2>
          <span className="text-sm text-gray-400">{steps.length}ステップ</span>
        </div>

        {steps.length === 0 && !addingStep && (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <Mail className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">まだステップがありません</p>
          </div>
        )}

        {steps.map((step) => (
          <div key={step.id} className="bg-white rounded-xl border border-gray-100">
            <button
              className="w-full flex items-center gap-3 p-4 text-left"
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
            >
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
                {step.stepNumber}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{step.subject}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {step.delayDays === 0 ? "登録直後" : `登録から${step.delayDays}日後`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStartEdit(step); }}
                  className="p-1.5 text-gray-300 hover:text-indigo-500 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteStep(step.id); }}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedStep === step.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {expandedStep === step.id && editingStepId === step.id && (
              <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">ステップ名（任意）</label>
                    <input type="text" value={editStep.name} onChange={(e) => setEditStep({ ...editStep, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="例：フォローアップ1通目" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">送信タイミング（登録から何日後）</label>
                    <input type="number" min={0} value={editStep.delay_days} onChange={(e) => setEditStep({ ...editStep, delay_days: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">件名 <span className="text-red-500">*</span></label>
                  <input type="text" value={editStep.subject} onChange={(e) => setEditStep({ ...editStep, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="メールの件名" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">本文 <span className="text-red-500">*</span></label>
                  <textarea value={editStep.body_html} onChange={(e) => setEditStep({ ...editStep, body_html: e.target.value })} rows={8} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder={"<p>{{name}}様</p>\n<p>...</p>"} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCancelEdit} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">キャンセル</button>
                  <button onClick={() => handleSaveEdit(step)} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    保存する
                  </button>
                </div>
              </div>
            )}

            {expandedStep === step.id && editingStepId !== step.id && (
              <div className="px-4 pb-4 border-t border-gray-50 pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">送信タイミング（日）</label>
                    <p className="text-sm text-gray-800">{step.delayDays === 0 ? "登録直後（0日後）" : `${step.delayDays}日後`}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">件名</label>
                    <p className="text-sm text-gray-800 truncate">{step.subject}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">本文プレビュー</label>
                  <p className="text-sm text-gray-600 line-clamp-3 bg-gray-50 rounded p-2">{step.bodyHtml.replace(/<[^>]*>/g, "")}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add step form */}
        {addingStep ? (
          <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-4">
            <h3 className="font-medium text-gray-900">ステップ {steps.length + 1} を追加</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">ステップ名（任意）</label>
                <input type="text" value={newStep.name} onChange={(e) => setNewStep({ ...newStep, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="例：フォローアップ1通目" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">送信タイミング（登録から何日後）</label>
                <input type="number" min={0} value={newStep.delay_days} onChange={(e) => setNewStep({ ...newStep, delay_days: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">件名 <span className="text-red-500">*</span></label>
              <input type="text" value={newStep.subject} onChange={(e) => setNewStep({ ...newStep, subject: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="メールの件名" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">本文 <span className="text-red-500">*</span></label>
              <textarea value={newStep.body_html} onChange={(e) => setNewStep({ ...newStep, body_html: e.target.value })} rows={8} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder={"<p>{{name}}様</p>\n<p>...</p>"} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddingStep(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">キャンセル</button>
              <button onClick={handleAddStep} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                追加する
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingStep(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            ステップを追加
          </button>
        )}
      </div>

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">ステップ配信を削除</h3>
                <p className="text-sm text-gray-500">この操作は取り消せません</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteSequence}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
