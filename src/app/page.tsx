import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import Link from "next/link";
import { Zap, CalendarDays, Users, Mail, ClipboardList, ArrowRight, CheckCircle } from "lucide-react";

export default async function RootPage() {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">SeminarFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
              ログイン
            </Link>
            <Link
              href="/auth/register"
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-white pt-20 pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <CheckCircle className="w-3.5 h-3.5" />
            セミナー主催者向け顧客管理SaaS
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-6">
            セミナー後の追客を、
            <br />
            <span className="text-indigo-600">もっとかんたんに。</span>
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            アンケート収集・顧客管理・メルマガ配信を一元化。<br />
            ステップ配信で参加者との関係を自動で育てましょう。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white text-base font-bold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              今すぐ利用開始する
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 text-base font-semibold px-8 py-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              ログイン
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">クレジットカード不要・無料プランあり</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">必要な機能がすべて揃っています</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: CalendarDays,
                color: "bg-indigo-50 text-indigo-600",
                title: "イベント管理",
                desc: "セミナー・ウェビナーを一元管理。参加者を自動で顧客として登録。",
              },
              {
                icon: ClipboardList,
                color: "bg-green-50 text-green-600",
                title: "アンケート収集",
                desc: "QRコードやURLでアンケートを配布。回答を顧客データに自動連携。",
              },
              {
                icon: Users,
                color: "bg-blue-50 text-blue-600",
                title: "顧客管理",
                desc: "タグや属性で顧客を分類。CSVインポートにも対応。",
              },
              {
                icon: Mail,
                color: "bg-purple-50 text-purple-600",
                title: "ステップ配信",
                desc: "登録後の日数に応じてメールを自動配信。フォローアップを自動化。",
              },
            ].map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-6">
                <div className={`w-12 h-12 ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-indigo-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">まずは無料で試してみましょう</h2>
          <p className="text-indigo-200 mb-8">名前とメールアドレスだけで始められます</p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            今すぐ無料で始める
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-700">SeminarFlow</span>
          </div>
          <p className="text-xs text-gray-400">© 2025 SeminarFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
