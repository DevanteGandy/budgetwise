import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BudgetWise",
  description: "Personal finance dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <div className="min-h-dvh">{children}</div>
      </body>
    </html>
  );
}
