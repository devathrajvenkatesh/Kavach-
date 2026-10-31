import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kavach | Intelligent Protection for AI Agents",
  description:
    "Kavach is an enterprise AI defense system providing intelligent protection for agents operating in untrusted environments.",
  icons: {
    icon: "/kavach-emblem.png",
    shortcut: "/kavach-emblem.png",
    apple: "/kavach-emblem.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FBF9F8] text-[#052326] antialiased selection:bg-[#C9A86A]/30">
        {children}
      </body>
    </html>
  );
}
