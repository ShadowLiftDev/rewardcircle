import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import DevToolbar from "@/components/dev/DevToolbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeonHQ",
  description: "Tools powering The Neon Lunchbox ecosystem.",
};

const JOIN_URL = "https://neon-hq.vercel.app/orgs/neon-lunchbox/join";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50 relative`}
      >
        {/* 🔥 Neon Ambient Background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-[5%] h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute top-10 right-[5%] h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute bottom-[-20%] left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-[999px] bg-gradient-to-r from-cyan-500/10 via-sky-400/5 to-purple-500/10 blur-[110px]" />
        </div>

        <AuthProvider>
          {/* ✅ Join Button */}
          <div className="fixed top-4 right-4 z-50">
            <a
              href={JOIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-black/30 backdrop-blur hover:border-cyan-400/60 hover:text-white hover:shadow-cyan-500/10 transition"
            >
              Join
              <span className="text-cyan-300/80">↗</span>
            </a>
          </div>

          {children}
          <DevToolbar />
        </AuthProvider>
      </body>
    </html>
  );
}