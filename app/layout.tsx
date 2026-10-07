import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NovaWorks Execution Desk",
  description: "Paste a meeting transcript and get assigned projects, tasks, deadlines and estimates automatically.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a5c66" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
