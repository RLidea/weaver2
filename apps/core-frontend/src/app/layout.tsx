import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/infrastructure/providers/query-provider";
import { AuthProvider } from "@/infrastructure/providers/auth-provider";
import { SkinProvider, ToastContainer, ToastProvider } from '@weaver2/ui';
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
    <html lang="ko" data-skin="default" suppressHydrationWarning>
      <head>
        {/* 스킨 플래시 방지: JS가 실행되기 전에 data-skin을 적용 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('skin');if(s)document.documentElement.setAttribute('data-skin',s);})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SkinProvider>
          <ToastProvider>
            <QueryProvider>
              <AuthProvider>{children}</AuthProvider>
            </QueryProvider>
            <ToastContainer />
          </ToastProvider>
        </SkinProvider>
      </body>
    </html>
  );
}
