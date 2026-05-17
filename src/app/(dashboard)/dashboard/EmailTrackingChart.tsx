"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

export type DailyTrackingData = {
  date: string;
  label: string;
  openRate: number;
  clickRate: number;
};

export function EmailTrackingChart({ data }: { data: DailyTrackingData[] }) {
  const hasData = data.some((d) => d.openRate > 0 || d.clickRate > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">
        メール開封率・クリック率（直近7日間）
      </h2>
      {!hasData ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-gray-400">
          直近7日間のメール送信データがありません
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              unit="%"
              domain={[0, "auto"]}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === "openRate" ? "開封率" : "クリック率",
              ]}
              labelFormatter={(label: string) => label}
            />
            <Legend
              formatter={(value: string) =>
                value === "openRate" ? "開封率" : "クリック率"
              }
            />
            <Line
              type="monotone"
              dataKey="openRate"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: "#6366f1" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="clickRate"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
