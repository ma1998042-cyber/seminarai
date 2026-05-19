"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, CalendarDays, Link2, Unlink, ExternalLink } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import {
  getCalendarConnectionStatus,
  saveSecondaryCalendarId,
  disconnectGoogle,
} from "./actions";

export default function CalendarSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [connected, setConnected] = useState(false);
  const [googleAccountId, setGoogleAccountId] = useState<string | null>(null);
  const [secondaryCalendarId, setSecondaryCalendarId] = useState("");

  useEffect(() => {
    const fetchStatus = async () => {
      const result = await getCalendarConnectionStatus();
      if ("error" in result && result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      setConnected(result.connected || false);
      setGoogleAccountId(result.googleAccountId || null);
      setSecondaryCalendarId(result.secondaryCalendarId || "");
      setLoading(false);
    };
    fetchStatus();
  }, []);

  const handleConnectGoogle = async () => {
    // better-authのlinkSocialを使ってGoogleアカウントを連携する
    // ログイン済みユーザーに対してソーシャルアカウントをリンクする
    await authClient.linkSocial({
      provider: "google",
      callbackURL: "/settings/calendar",
    });
  };

  const handleDisconnect = async () => {
    if (!confirm("Googleカレンダー連携を解除しますか？")) return;
    setDisconnecting(true);
    setError("");
    setSuccess("");

    const result = await disconnectGoogle();
    if (result.error) {
      setError(result.error);
    } else {
      setConnected(false);
      setGoogleAccountId(null);
      setSuccess("Googleカレンダー連携を解除しました");
    }
    setDisconnecting(false);
  };

  const handleSaveCalendarId = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    // 簡易的なメールアドレス形式バリデーション
    if (secondaryCalendarId && !secondaryCalendarId.includes("@")) {
      setError("カレンダーIDはメールアドレス形式で入力してください");
      setSaving(false);
      return;
    }

    const result = await saveSecondaryCalendarId(secondaryCalendarId);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("カレンダーIDを保存しました");
    }
    setSaving(false);
  };

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Googleカレンダー連携
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Googleカレンダーと連携して、空き状況の確認に利用します
        </p>
      </div>

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Google連携セクション */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
            <CalendarDays className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              Googleアカウント連携
            </p>
            <p className="text-sm text-gray-500">
              Googleカレンダーの空き状況を取得するために連携が必要です
            </p>
          </div>
        </div>

        {connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Link2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">連携済み</p>
                {googleAccountId && (
                  <p className="text-sm text-green-600 truncate">
                    {googleAccountId}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {disconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
                連携解除
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Googleアカウントを連携すると、カレンダーの空き状況（FreeBusy）を自動で確認できるようになります。
            </p>
            <button
              type="button"
              onClick={handleConnectGoogle}
              className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Googleカレンダーを連携する
            </button>
          </div>
        )}
      </div>

      {/* セカンダリカレンダーID設定セクション */}
      <form
        onSubmit={handleSaveCalendarId}
        className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
            <ExternalLink className="w-7 h-7 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              もう1人のカレンダー設定
            </p>
            <p className="text-sm text-gray-500">
              共有されたカレンダーのIDを設定して、2人分の空き状況を確認できます
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            カレンダーID（メールアドレス形式）
          </label>
          <input
            type="text"
            value={secondaryCalendarId}
            onChange={(e) => setSecondaryCalendarId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="example@gmail.com"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            もう1人のGoogleカレンダーを共有してもらい、そのメールアドレスを入力してください。
            Googleカレンダーの設定から「特定のユーザーとの共有」で「予定の表示（時間枠のみ、詳細は非表示）」以上の権限で共有してもらう必要があります。
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          保存する
        </button>
      </form>
    </div>
  );
}
