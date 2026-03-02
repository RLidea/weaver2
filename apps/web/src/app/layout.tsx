import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/infrastructure/providers/query-provider";
import { AuthProvider } from "@/infrastructure/providers/auth-provider";
import { ToastProvider } from "@/infrastructure/providers/toast-provider";
import { SkinProvider } from "@/infrastructure/providers/skin-provider";
import { ToastContainer } from "@/shared/components/ui/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weaver",
  description: "Weaver web application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-skin="default">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkinProvider>
          <QueryProvider>
            <ToastProvider>
              <AuthProvider>{children}</AuthProvider>
              <ToastContainer />
            </ToastProvider>
          </QueryProvider>
        </SkinProvider>
      </body>
    </html>
  );
}
