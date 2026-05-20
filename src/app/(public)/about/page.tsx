import { User } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "運営者情報 | ひとり社長サロン",
  description: "ひとり社長サロンの運営者情報",
};

export default function AboutPage() {

  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">運営者情報</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              ひとり社長サロン
            </h2>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="text-sm text-gray-600 leading-relaxed space-y-4">
              <p className="text-base text-gray-800 font-medium italic">
                「AIは便利だと分かっている。でも、自分の業務にどう落とし込めばいいか分からない」
              </p>

              <p>
                独立してから、ひとり社長の方々と話すたびにこの声を聞いてきました。
              </p>

              <p>
                はじめまして、清水勝紀と申します。
              </p>

              <p>
                システムエンジニアを経て独立し、現在はClaude Codeの伴走支援を行っています。
              </p>

              <p className="text-base text-gray-800 font-medium italic">
                ChatGPTもClaudeも触ってみた。でも結局、自分でやった方が早くて使わなくなる。
              </p>

              <p>
                Claude Codeはその壁を壊せる数少ないツールです。
              </p>

              <p>
                ただし、ひとりで学ぶには少しハードルが高い。
              </p>

              <p>
                だから私は、隣で一緒に走る「伴走者」という形を選びました。
              </p>

              <p>
                目指すのは、あなたがClaude Codeで自分の業務を回せる状態です。
                属人化から抜け出し、AIを味方につけて、本質的な仕事に集中できる毎日を一緒に作っていきます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
