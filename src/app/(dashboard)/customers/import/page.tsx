"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, ChevronRight, CheckCircle, Loader2, FileText,
  X, CalendarDays, ArrowLeft, Download, Info,
} from "lucide-react";
import { getOrgAndEvents, importCustomers } from "./actions";

type CsvRow = Record<string, string>;

const CUSTOMER_FIELDS = [
  { key: "email", label: "メールアドレス", required: true },
  { key: "full_name", label: "氏名" },
  { key: "phone", label: "電話番号" },
  { key: "company", label: "会社名" },
  { key: "job_title", label: "役職" },
] as const;

type FieldKey = typeof CUSTOMER_FIELDS[number]["key"];

const SAMPLE_CSV = `メールアドレス,氏名,電話番号,会社名,役職
taro@example.com,山田太郎,090-1234-5678,株式会社サンプル,部長
hanako@example.com,鈴木花子,080-9876-5432,テスト株式会社,課長`;

function downloadSampleCsv() {
  const bom = "\uFEFF";
  const blob = new Blob([bom + SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample_customers.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  // RFC 4180 準拠パーサー: クォート内改行・エスケープされたクォート("")に対応
  const records: string[][] = [];
  let current = "";
  let inQuotes = false;
  let fields: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        // "" はエスケープされたクォート
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          // クォート終了
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else if (ch === "\r") {
        // \r\n or standalone \r → レコード区切り
        if (i + 1 < text.length && text[i + 1] === "\n") {
          i++;
        }
        fields.push(current.trim());
        current = "";
        if (fields.some((f) => f !== "")) {
          records.push(fields);
        }
        fields = [];
      } else if (ch === "\n") {
        fields.push(current.trim());
        current = "";
        if (fields.some((f) => f !== "")) {
          records.push(fields);
        }
        fields = [];
      } else {
        current += ch;
      }
    }
  }

  // 最後のレコードを処理
  fields.push(current.trim());
  if (fields.some((f) => f !== "")) {
    records.push(fields);
  }

  if (records.length === 0) return { headers: [], rows: [] };

  const headers = records[0];
  const rows = records.slice(1).map((values) => {
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });

  return { headers, rows };
}

function guessMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const lower = headers.map((h) => h.toLowerCase());
  const mapping: Partial<Record<FieldKey, string>> = {};

  const patterns: Record<FieldKey, string[]> = {
    email: ["email", "メール", "mail", "e-mail"],
    full_name: ["name", "氏名", "名前", "full_name", "fullname", "お名前"],
    phone: ["phone", "tel", "電話", "mobile"],
    company: ["company", "会社", "企業", "organization"],
    job_title: ["job", "title", "役職", "position"],
  };

  for (const [field, pats] of Object.entries(patterns) as [FieldKey, string[]][]) {
    const idx = lower.findIndex((h) => pats.some((p) => h.includes(p)));
    if (idx !== -1) mapping[field] = headers[idx];
  }

  return mapping;
}

type Event = { id: string; title: string; event_type: string; status: string };

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: CSV
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");

  // Step 2: Mapping
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});

  // Step 3: Event
  const [events, setEvents] = useState<Event[]>([]);
  const [eventMode, setEventMode] = useState<"existing" | "new" | "none">("none");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventType, setNewEventType] = useState("seminar");

  // Step 4: Result
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("CSVファイルを選択してください");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsv(text);
      setHeaders(headers);
      setRows(rows);
      setMapping(guessMapping(headers));
      setError("");
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const goToStep2 = () => {
    if (rows.length === 0) { setError("CSVファイルを選択してください"); return; }
    setStep(2);
    setError("");
  };

  const goToStep3 = async () => {
    if (!mapping.email) { setError("メールアドレスの列を選択してください"); return; }
    setLoading(true);
    const data = await getOrgAndEvents();
    setLoading(false);
    if (data.error) { setError(data.error); return; }
    setEvents(data.events ?? []);
    setStep(3);
    setError("");
  };

  const handleImport = async () => {
    setLoading(true);
    setError("");

    const customers = rows.map((row) => ({
      email: mapping.email ? row[mapping.email] : "",
      full_name: mapping.full_name ? row[mapping.full_name] : undefined,
      phone: mapping.phone ? row[mapping.phone] : undefined,
      company: mapping.company ? row[mapping.company] : undefined,
      job_title: mapping.job_title ? row[mapping.job_title] : undefined,
    }));

    const res = await importCustomers({
      customers,
      eventMode,
      eventId: selectedEventId,
      newEventTitle,
      newEventType,
    });

    setLoading(false);
    if ("error" in res && res.error) { setError(res.error); return; }
    if ("imported" in res) {
      setResult({ imported: res.imported!, skipped: res.skipped! });
      setStep(4);
    }
  };

  const stepLabels = ["CSVアップロード", "列のマッピング", "イベント選択", "完了"];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/customers")} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CSVインポート</h1>
          <p className="text-sm text-gray-500 mt-0.5">顧客データをCSVファイルから一括登録</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 ${i < step - 1 ? "text-green-600" : i === step - 1 ? "text-indigo-600" : "text-gray-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step - 1 ? "bg-green-100" : i === step - 1 ? "bg-indigo-100" : "bg-gray-100"
              }`}>
                {i < step - 1 ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{label}</span>
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`h-px flex-1 ${i < step - 1 ? "bg-green-300" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Format guide */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-blue-800">CSVデータ形式</h3>
              </div>
              <p className="text-xs text-blue-700 mb-2">1行目をヘッダー行として認識します。次の列に対応しています：</p>
              <div className="overflow-x-auto rounded border border-blue-200 bg-white mb-3">
                <table className="text-xs w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-3 py-1.5 text-left text-blue-700 font-medium">フィールド</th>
                      <th className="px-3 py-1.5 text-left text-blue-700 font-medium">必須</th>
                      <th className="px-3 py-1.5 text-left text-blue-700 font-medium">認識されるヘッダー例</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-100">
                    <tr><td className="px-3 py-1.5 text-gray-700">メールアドレス</td><td className="px-3 py-1.5 text-red-500 font-medium">必須</td><td className="px-3 py-1.5 text-gray-500">email, メール, mail, e-mail</td></tr>
                    <tr><td className="px-3 py-1.5 text-gray-700">氏名</td><td className="px-3 py-1.5 text-gray-400">任意</td><td className="px-3 py-1.5 text-gray-500">name, 氏名, 名前, お名前</td></tr>
                    <tr><td className="px-3 py-1.5 text-gray-700">電話番号</td><td className="px-3 py-1.5 text-gray-400">任意</td><td className="px-3 py-1.5 text-gray-500">phone, tel, 電話, mobile</td></tr>
                    <tr><td className="px-3 py-1.5 text-gray-700">会社名</td><td className="px-3 py-1.5 text-gray-400">任意</td><td className="px-3 py-1.5 text-gray-500">company, 会社, 企業</td></tr>
                    <tr><td className="px-3 py-1.5 text-gray-700">役職</td><td className="px-3 py-1.5 text-gray-400">任意</td><td className="px-3 py-1.5 text-gray-500">job, title, 役職, position</td></tr>
                  </tbody>
                </table>
              </div>
              <button
                onClick={downloadSampleCsv}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                サンプルCSVをダウンロード
              </button>
            </div>

            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center hover:border-indigo-300 transition-colors cursor-pointer"
              onClick={() => document.getElementById("csv-input")?.click()}
            >
              <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">クリックまたはドラッグ&ドロップ</p>
              <p className="text-xs text-gray-400 mt-1">CSVファイル（UTF-8）</p>
              <input
                id="csv-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {fileName && (
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{fileName}</p>
                  <p className="text-xs text-gray-500">{rows.length}行を検出</p>
                </div>
                <button onClick={() => { setFileName(""); setRows([]); setHeaders([]); }}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}

            {rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <table className="text-xs w-full">
                  <thead className="bg-gray-50">
                    <tr>{headers.map((h) => <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i}>{headers.map((h) => <td key={h} className="px-3 py-2 text-gray-600 truncate max-w-[120px]">{row[h]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 3 && <p className="text-xs text-gray-400 px-3 py-2">他 {rows.length - 3} 行...</p>}
              </div>
            )}

            <button onClick={goToStep2} disabled={rows.length === 0} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              次へ <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">列のマッピング</h2>
              <p className="text-sm text-gray-500">CSVの列を顧客フィールドに対応付けてください</p>
            </div>

            <div className="space-y-3">
              {CUSTOMER_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700">{field.label}</span>
                    {"required" in field && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <select
                    value={mapping[field.key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value || undefined }))}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- 対応する列を選択 --</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                戻る
              </button>
              <button onClick={goToStep3} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                次へ <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Event */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">イベントと紐付け</h2>
              <p className="text-sm text-gray-500">インポートする顧客をイベントの参加者として登録できます</p>
            </div>

            <div className="space-y-2">
              {[
                { value: "none", label: "イベントに紐付けない" },
                { value: "existing", label: "既存のイベントを選択" },
                { value: "new", label: "新しいイベントを作成" },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${eventMode === opt.value ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <input type="radio" name="eventMode" value={opt.value} checked={eventMode === opt.value} onChange={() => setEventMode(opt.value as typeof eventMode)} className="accent-indigo-600" />
                  <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>

            {eventMode === "existing" && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">イベントがありません</p>
                ) : (
                  events.map((ev) => (
                    <label key={ev.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedEventId === ev.id ? "border-indigo-500 bg-indigo-50" : "border-gray-100 hover:border-gray-300"}`}>
                      <input type="radio" name="event" value={ev.id} checked={selectedEventId === ev.id} onChange={() => setSelectedEventId(ev.id)} className="accent-indigo-600" />
                      <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{ev.title}</span>
                    </label>
                  ))
                )}
              </div>
            )}

            {eventMode === "new" && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">イベント名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="例：マーケティングセミナー2024"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">イベントタイプ</label>
                  <select value={newEventType} onChange={(e) => setNewEventType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {[["seminar","セミナー"],["webinar","ウェビナー"],["workshop","ワークショップ"],["course","講座"],["other","その他"]].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                戻る
              </button>
              <button
                onClick={handleImport}
                disabled={loading || (eventMode === "existing" && !selectedEventId) || (eventMode === "new" && !newEventTitle.trim())}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {rows.length}件をインポート
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && result && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">インポート完了</h2>
              <p className="text-sm text-gray-500 mt-1">顧客データをインポートしました</p>
            </div>
            <div className="flex gap-4 justify-center">
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">{result.imported}</p>
                <p className="text-xs text-gray-500">インポート成功</p>
              </div>
              {result.skipped > 0 && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-400">{result.skipped}</p>
                  <p className="text-xs text-gray-500">スキップ</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push("/customers")} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors">
                顧客一覧へ
              </button>
              <button onClick={() => { setStep(1); setRows([]); setHeaders([]); setFileName(""); setResult(null); }} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors">
                続けてインポート
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
