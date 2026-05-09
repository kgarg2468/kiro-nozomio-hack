import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kiro Company Brain",
  description: "Day-one onboarding portal for coding agents."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
