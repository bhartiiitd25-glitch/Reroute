import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PathShare - Share Your Routes",
  description: "Create and share custom routes with anyone using Google Maps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
