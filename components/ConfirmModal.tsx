"use client";

import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmText,
  cancelText,
  isDanger = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const resolvedConfirm = confirmText || confirmLabel || "Delete Incident";
  const resolvedCancel = cancelText || cancelLabel || "Cancel";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-cardBg p-6 shadow-2xl border border-slate/40">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute right-4 top-4 text-slate hover:text-navy p-1 rounded-lg"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-burgundy/10 text-burgundy">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-black text-navy">{title}</h3>
            <p className="mt-2 text-sm text-navy/80 leading-relaxed font-normal">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-xl border border-slate/40 bg-cream px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-200 transition disabled:opacity-50"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-burgundy px-4 py-2 text-sm font-bold text-cream hover:bg-burgundy-light transition shadow-sm disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-cream border-t-transparent" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>{resolvedConfirm}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
