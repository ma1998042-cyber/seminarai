import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | ひとり社長サロン",
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
                  ひとり社長サロン
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  運営責任者
                </th>
                <td className="py-4 text-gray-600">
                  清水 勝紀
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  所在地
                </th>
                <td className="py-4 text-gray-600">
                  〒125-0054<br />
                  東京都葛飾区高砂３丁目１−２０
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  電話番号
                </th>
                <td className="py-4 text-gray-600">
                  080-9383-2899<br />
                  <span className="text-xs text-gray-500">
                    （受付時間：平日 10:00〜18:00 / 土日祝休み）
                  </span>
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  メールアドレス
                </th>
                <td className="py-4 text-gray-600">
                  katsunori.shimizu@sk-techlab.com
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  販売価格
                </th>
                <td className="py-4 text-gray-600">
                  各サービスページに記載の金額（消費税込）<br />
                  <span className="text-xs text-gray-500">
                    ※個別契約による伴走支援は、お見積もり時に提示する金額となります
                  </span>
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  商品代金以外の必要料金
                </th>
                <td className="py-4 text-gray-600">
                  インターネット接続に必要な通信費、Claude等の外部サービス利用料は、お客様のご負担となります
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  支払方法
                </th>
                <td className="py-4 text-gray-600">
                  銀行振込、クレジットカード決済<br />
                  <span className="text-xs text-gray-500">
                    （利用可能な決済方法は、サービスにより異なります）
                  </span>
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  支払時期
                </th>
                <td className="py-4 text-gray-600">
                  銀行振込：請求書発行後7日以内<br />
                  クレジットカード決済：申込時
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  サービス提供時期
                </th>
                <td className="py-4 text-gray-600">
                  入金確認後、当方とお客様との間で合意した日程よりサービスを開始します
                </td>
              </tr>
              <tr>
                <th className="py-4 pr-4 text-left font-medium text-gray-700 align-top">
                  返品・キャンセルについて
                </th>
                <td className="py-4 text-gray-600">
                  本サービスは役務提供のため、原則として申込み後のキャンセル・返金はお受けできません。
                  ただし、当方の責に帰すべき事由によりサービス提供が困難となった場合は、未提供分について返金対応をいたします。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}