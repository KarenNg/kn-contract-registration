import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contract Registration",
  description: "Track vendors, contracts, and supporting documents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
