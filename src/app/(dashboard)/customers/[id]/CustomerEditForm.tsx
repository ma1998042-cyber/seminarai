"use client";

import { useState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { updateCustomer, deleteCustomer } from "../actions";
import { useRouter } from "next/navigation";

const statusOptions = [
  { value: "active", label: "有効" },
  { value: "unsubscribed", label: "配信停止" },
  { value: "bounced", label: "バウンス" },
  { value: "blocked", label: "ブロック" },
];

interface Props {
  customerId: string;
  initial: {
    full_name: string;
    email: string;
    phone: string;
    company: string;
    job_title: string;
    notes: string;
    status: string;
  };
}

export default function CustomerEditForm({ customerId, initial }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [fullName, setFullName] = useState(initial.full_name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [company, setCompany] = useState(initial.company);
  const [jobTitle, setJobTitle] = useState(initial.job_title);
  const [notes, setNotes] = useState(initial.notes);
  const [status, setStatus] = useState(initial.status);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    const result = await updateCustomer(customerId, {
      full_name: fullName || undefined,
      email,
      phone: phone || undefined,
      company: company || undefined,
      job_title: jobTitle || undefined,
      notes: notes || undefined,
      status,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirm("この顧客を削除してもよいですか？この操作は取り消せません。")) return;
    const result = await deleteCustomer(customerId);
    if (result.error) { setError(result.error); return; }
    router.push("/customers");
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">顧客情報</h2>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          削除
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">氏名</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="山田 太郎" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス <span className="text-red-500">*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">電話番号</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="090-0000-0000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">会社名</label>
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="株式会社○○" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">役職</label>
          <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="代表取締役" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">ステータス</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">メモ</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="顧客に関するメモを入力..." />
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? "保存しました！" : "変更を保存"}
      </button>
    </div>
  );
}
