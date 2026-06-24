import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface MessageModalProps {
  isOpen: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
}

export function MessageModal({ isOpen, type, title, message, onClose }: MessageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full overflow-hidden text-left p-6 space-y-4">
        <div className="flex items-start gap-3">
          {type === "success" ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
          )}
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-900 dark:text-slate-105 text-sm">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-all cursor-pointer ${
              type === "success" ? "bg-[#00786f] hover:bg-[#005a53]" : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
