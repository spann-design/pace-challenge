import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { ACCENT_STORAGE_KEY, ACCENTS } from "@/lib/theme";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], axes: ["opsz"], variable: "--font-fraunces" });
const dmSans = DM_Sans({ subsets: ["latin"], axes: ["opsz"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "Pace",
  description: "Small daily habits, tracked with friends.",
  applicationName: "Pace",
  // iPhone "Add to Home Screen": full screen, named Pace, using app/apple-icon.png.
  appleWebApp: { capable: true, title: "Pace", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FAF6F2",
};

// Runs before first paint so the saved accent shows immediately (no flash of the default).
const accentScript = `try{var a=localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});if(${JSON.stringify(
  ACCENTS.map((x) => x.id),
)}.indexOf(a)>-1)document.documentElement.dataset.accent=a}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-accent="golden" className={`${fraunces.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: accentScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
