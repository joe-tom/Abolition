import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper Writer",
  description: "AI-powered academic paper writing assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
