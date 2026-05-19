import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | SeminarAI",
};

export default function LegalPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          特定商取引法に基づく表記
        </h1>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top w-1/3">
                  販売事業者名
                </th>
                <td className="py-4 text-gray-600">
                  （事業者名を記載してください）
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  代表者名
                </th>
                <td className="py-4 text-gray-600">
                  （代表者名を記載してください）
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  所在地
                </th>
                <td className="py-4 text-gray-600">
                  （所在地を記載してください）
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  連絡先
                </th>
                <td className="py-4 text-gray-600">
                  （メールアドレス・電話番号を記載してください）
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  販売価格
                </th>
                <td className="py-4 text-gray-600">
                  各サービス・イベントページをご参照ください
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  商品代金以外の必要料金
                </th>
                <td className="py-4 text-gray-600">
                  なし（インターネット接続にかかる通信費はお客様のご負担となります）
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  支払方法
                </th>
                <td className="py-4 text-gray-600">
                  クレジットカード決済
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  支払時期
                </th>
                <td className="py-4 text-gray-600">
                  サービス申込時またはイベント申込時
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  商品の引渡時期
                </th>
                <td className="py-4 text-gray-600">
                  お支払い完了後、直ちにサービスをご利用いただけます
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  返品・キャンセルについて
                </th>
                <td className="py-4 text-gray-600">
                  デジタルコンテンツの性質上、お支払い後の返品・返金はお受けしておりません。
                  イベントのキャンセルについては、各イベントページの記載に従います。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
