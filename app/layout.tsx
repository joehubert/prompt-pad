import type { Metadata } from "next";

import NavBar from "@/app/_components/NavBar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Pad",
  description: "Free LLM inference playground",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
