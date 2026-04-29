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
      <body className="h-full bg-gray-950 text-gray-100 font-mono overflow-hidden">
        {children}
      </body>
    </html>
  );
}
