import { Suspense } from "react";
import { AppFrame } from "@/components/app-frame";

// Signed-in screens read the URL and the session, so they render in the
// browser inside this Suspense boundary (required with Cache Components).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense>
      <AppFrame>{children}</AppFrame>
    </Suspense>
  );
}
