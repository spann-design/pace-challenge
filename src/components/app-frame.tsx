"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { SessionProvider } from "./session";
import { ToastProvider } from "./ui";

type Frame = { openAdd: () => void };
const FrameCtx = createContext<Frame>({ openAdd: () => {} });
export const useFrame = () => useContext(FrameCtx);

/** Signed-in screens: session, toasts, the floating tab bar and the Add sheet. */
export function AppFrame({ children, addSheet }: { children: ReactNode; addSheet?: (open: boolean, close: () => void) => ReactNode }) {
  const [adding, setAdding] = useState(false);
  return (
    <SessionProvider>
      <ToastProvider>
        <FrameCtx.Provider value={{ openAdd: () => setAdding(true) }}>
          <main className="pt-safe mx-auto flex min-h-dvh max-w-[480px] flex-col gap-5 px-5 pb-[132px]">{children}</main>
          <BottomNav onAdd={() => setAdding(true)} />
          {addSheet?.(adding, () => setAdding(false))}
        </FrameCtx.Provider>
      </ToastProvider>
    </SessionProvider>
  );
}
