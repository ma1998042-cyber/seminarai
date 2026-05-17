"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const VARIABLES = [
  { value: "{{name}}", label: "顧客名" },
  { value: "{{email}}", label: "メールアドレス" },
  { value: "{{company}}", label: "会社名" },
];

interface VariableInsertButtonProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsert: (newValue: string) => void;
}

export function VariableInsertButton({ textareaRef, onInsert }: VariableInsertButtonProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;
    const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);

    onInsert(newValue);

    // カーソル位置を挿入後に設定
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    });

    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
      >
        差し込み変数
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {VARIABLES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => handleSelect(v.value)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="font-mono text-indigo-600">{v.value}</span>
              <span className="text-gray-500 ml-2">{v.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
