"use client";

import { useState } from "react";
import { CalendarDays, X } from "lucide-react";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { getPublicAvailableDatesAction } from "./actions";

export default function PublicAvailabilitySection({
  eventId,
  onDateSelect,
  selectedDate,
}: {
  eventId: string;
  onDateSelect: (date: string | null) => void;
  selectedDate: string | null;
}) {
  const fetchDates = async () => {
    return getPublicAvailableDatesAction(eventId);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-indigo-500" />
        希望日時を選択
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        カレンダーで空き状況を確認し、希望の日時を選択してください
      </p>

      <AvailabilityCalendar
        onSelectDate={(date) => onDateSelect(date)}
        fetchDatesAction={fetchDates}
      />

      {selectedDate && (
        <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800">
              希望日時: {formatSelectedDate(selectedDate)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDateSelect(null)}
            className="p-1 hover:bg-indigo-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-indigo-500" />
          </button>
        </div>
      )}
    </div>
  );
}

function formatSelectedDate(dateStr: string): string {
  // dateStr is "YYYY-MM-DDT10:00" format
  const [datePart, timePart] = dateStr.split("T");
  if (!datePart) return dateStr;
  const [year, month, day] = datePart.split("-");
  const timeDisplay = timePart ? ` ${timePart}` : "";
  return `${year}年${Number(month)}月${Number(day)}日${timeDisplay}`;
}
