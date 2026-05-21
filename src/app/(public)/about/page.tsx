import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "運営者情報 | ひとり社長サロン",
  description: "ひとり社長サロンの運営者情報",
};

export default function AboutPage() {
  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">運営者情報</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 sm:p-12">
          {/* プロフィールヘッダー */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-32 h-32 rounded-2xl overflow-hidden mb-5 shadow-md">
              <Image
                src="/images/profile.png"
                alt="清水 勝紀"
                width={128}
                height={128}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              清水 勝紀
            </h2>
            <p className="text-sm text-gray-500">ひとり社長サロン 運営</p>
          </div>

          <div className="border-t border-gray-100 pt-10">
            {/* 印象的な引用ブロック */}
            <blockquote className="relative pl-5 border-l-4 border-indigo-400 mb-8">
              <p className="text-lg sm:text-xl text-gray-900 font-medium leading-relaxed">
                「AIは便利だと分かっている。<br />
                でも、自分の業務にどう落とし込めばいいか分からない」
              </p>
            </blockquote>

            {/* 本文：段落として自然な流れに */}
            <div className="text-base text-gray-700 leading-loose space-y-6">
              <p>
                独立してから、ひとり社長の方々と話すたびに、この声を聞いてきました。
              </p>

              <p>
                はじめまして、清水勝紀と申します。システムエンジニアを経て独立し、現在は<strong className="text-gray-900 font-semibold">Claude Codeの伴走支援</strong>を行っています。
              </p>

              <p>
                ChatGPTもClaudeも触ってみた。でも結局、自分でやった方が早くて使わなくなる——。Claude Codeは、その壁を壊せる数少ないツールです。
              </p>

              <p>
                ただし、ひとりで学ぶには少しハードルが高い。だから私は、隣で一緒に走る<strong className="text-gray-900 font-semibold">「伴走者」</strong>という形を選びました。
              </p>

              <p>
                目指すのは、あなたがClaude Codeで自分の業務を回せる状態。属人化から抜け出し、AIを味方につけて、本質的な仕事に集中できる毎日を、一緒に作っていきます。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}