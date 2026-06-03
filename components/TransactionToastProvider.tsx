"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type TxHash = `0x${string}`;
type ToastType = "register" | "mint" | "claim" | "vault" | "default";

interface TransactionToastInput {
  label: string;
  hash: TxHash;
  type?: ToastType;
}

interface TransactionToast extends TransactionToastInput {
  id: string;
  visible: boolean;
}

interface TransactionToastContextValue {
  addTransactionToast: (toast: TransactionToastInput) => void;
}

const TransactionToastContext = createContext<TransactionToastContextValue | null>(null);

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://aeneid.storyscan.io";

function getTxUrl(hash: TxHash) {
  return `${EXPLORER_BASE.replace(/\/$/, "")}/tx/${hash}`;
}

function shortenHash(hash: TxHash) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

const TYPE_STYLES: Record<ToastType, { border: string; icon: string; bg: string }> = {
  register: {
    border: "border-accent/30",
    icon: "🎵",
    bg: "bg-accent-subtle",
  },
  mint: {
    border: "border-purple-500/30",
    icon: "🔑",
    bg: "bg-purple-500/10",
  },
  claim: {
    border: "border-emerald-500/30",
    icon: "💰",
    bg: "bg-emerald-500/10",
  },
  vault: {
    border: "border-cyan-500/30",
    icon: "🔒",
    bg: "bg-cyan-500/10",
  },
  default: {
    border: "border-border",
    icon: "📡",
    bg: "bg-card/95",
  },
};

function detectType(label: string): ToastType {
  const lower = label.toLowerCase();
  if (lower.includes("register") || lower.includes("track")) return "register";
  if (lower.includes("mint") || lower.includes("license")) return "mint";
  if (lower.includes("claim") || lower.includes("revenue")) return "claim";
  if (lower.includes("vault") || lower.includes("allocate") || lower.includes("write")) return "vault";
  return "default";
}

export function TransactionToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<TransactionToast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addTransactionToast = useCallback((toast: TransactionToastInput) => {
    const id = `${toast.hash}-${Date.now()}`;
    const type = toast.type ?? detectType(toast.label);
    setToasts((current) =>
      [{ ...toast, type, id, visible: true }, ...current].slice(0, 4)
    );
    setTimeout(() => removeToast(id), 10_000);
  }, [removeToast]);

  const value = useMemo(
    () => ({ addTransactionToast }),
    [addTransactionToast],
  );

  return (
    <TransactionToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => {
          const styles = TYPE_STYLES[toast.type ?? "default"];
          return (
            <div
              key={toast.id}
              className={`rounded-xl border ${styles.border} bg-card/95 p-4 text-sm shadow-2xl backdrop-blur transition-all duration-300 pointer-events-auto ${
                toast.visible
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-full opacity-0"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 text-base leading-none">{styles.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground">{toast.label}</p>
                    <a
                      href={getTxUrl(toast.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate font-mono text-xs text-accent hover:text-accent-hover"
                    >
                      {shortenHash(toast.hash)}
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 rounded-md p-1 text-muted hover:bg-card-hover hover:text-foreground transition-colors"
                  aria-label="Dismiss"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </TransactionToastContext.Provider>
  );
}

export function useTransactionToasts() {
  const context = useContext(TransactionToastContext);
  if (!context) {
    throw new Error("useTransactionToasts must be used inside TransactionToastProvider");
  }
  return context;
}
