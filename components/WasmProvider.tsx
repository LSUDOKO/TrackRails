"use client";

import { initWasm } from "@piplabs/cdr-sdk";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface WasmContextValue {
  ready: boolean;
  error: Error | null;
}

const WasmContext = createContext<WasmContextValue>({ ready: false, error: null });

export function useWasm() {
  return useContext(WasmContext);
}

export default function WasmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WasmContextValue>({ ready: false, error: null });

  useEffect(() => {
    let cancelled = false;

    initWasm()
      .then(() => {
        if (!cancelled) setState({ ready: true, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error("[WasmProvider] WASM initialization failed:", error);
          setState({ ready: false, error });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <h2 className="mb-2 text-lg font-semibold text-red-800 dark:text-red-200">
            Initialization Failed
          </h2>
          <p className="text-sm text-red-600 dark:text-red-400">
            Could not load the encryption module. Please refresh and try again.
          </p>
          {process.env.NODE_ENV === "development" && (
            <pre className="mt-3 overflow-auto rounded bg-red-100 p-2 text-left text-xs text-red-700 dark:bg-red-900 dark:text-red-300">
              {state.error.message}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (!state.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-800 dark:border-zinc-600 dark:border-t-zinc-200" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Initializing encryption module…
          </p>
        </div>
      </div>
    );
  }

  return <WasmContext.Provider value={state}>{children}</WasmContext.Provider>;
}
