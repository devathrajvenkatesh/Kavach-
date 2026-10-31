import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Possessed Butler | Defensive LLM Agent",
  description:
    "A defensive LLM agent architecture designed to execute legitimate tasks while resisting indirect prompt injection, goal hijacking, privilege escalation, and unauthorized tool execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
