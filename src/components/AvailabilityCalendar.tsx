"use client";

import { useState } from "react";
import { CalendarDays, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { getAvailableDatesAction } from "@/app/(dashboard)/events/actions";

type DateStatus = {
  date: string;
  status: "both_free" | "one_free" | "both_busy";
};

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export default function AvailabilityCalendar({
  onSelectDate,
}: {
  onSelectDate: (date: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dates, setDates] = useState<DateStatus[] | null>(null);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const handleCheck = async () => {
    setLoading(true);
    setError("");
    const result = await getAvailableDatesAction();
    if (result.error) {
      setError(result.error);
      setDates(null);
    } else if (result.dates) {
      setDates(result.dates);
    }
    setLoading(false);
  };

  const getStatusForDate = (dateStr: string): DateStatus["status"] | null => {
    if (!dates) return null;
    const found = dates.find((d) => d.date === dateStr);
    return found?.status ?? null;
  };

  const getStatusColor = (status: DateStatus["status"] | null) => {
    switch (status) {
      case "both_free":
        return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200";
      case "one_free":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200";
      case "both_busy":
        return "bg-gray-100 text-gray-400 border-gray-200";
      default:
        return "text-gray-700 hover:bg-gray-50 border-transparent";
    }
  };

  // カレンダーグリッドの生成
  const generateCalendarDays = () => {
    const { year, month } = displayMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    // 月初の曜日まで空白を埋める
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(d);
    }
    return days;
  };

  const formatDateStr = (day: number) => {
    const { year, month } = displayMonth;
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const handlePrevMonth = () => {
    setDisplayMonth((prev) => {
      const m = prev.month - 1;
      if (m < 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: m };
    });
  };

  const handleNextMonth = () => {
    setDisplayMonth((prev) => {
      const m = prev.month + 1;
      if (m > 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: m };
    });
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDateStr(day);
    const status = getStatusForDate(dateStr);
    // both_busy でもクリックは許可（ユーザーの判断に任せる）
    // datetime-local 形式に変換（時刻は10:00をデフォルト）
    onSelectDate(`${dateStr}T10:00`);
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleCheck}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CalendarDays className="w-4 h-4" />
        )}
        空き日を確認
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {dates && (
        <div className="border border-gray-200 rounded-lg p-4">
          {/* 月ナビゲーション */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {displayMonth.year}年{displayMonth.month + 1}月
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`text-center text-xs font-medium py-1 ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="aspect-square" />;
              }
              const dateStr = formatDateStr(day);
              const status = getStatusForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isPast = dateStr < todayStr;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={isPast}
                  className={`aspect-square flex items-center justify-center text-sm rounded-lg border transition-colors ${
                    isPast
                      ? "text-gray-300 border-transparent cursor-not-allowed"
                      : getStatusColor(status)
                  } ${isToday ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* 凡例 */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
              <span className="text-xs text-gray-500">両方空き</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
              <span className="text-xs text-gray-500">片方のみ空き</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />
              <span className="text-xs text-gray-500">両方予定あり</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
