import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Soma — Your On-Chain Financial Oracle",
  description: "Read your wallet. Know your money. Personalized AI financial insights powered by your Celo wallet history.",
  other: {
    "talentapp:project_verification": "05d5914e65a1d6b5aa2839481982baf02a3c9543db32bf1fdbf6f9d6628b9f06822ebf34cfdf4b92435ba3693dd3911d4df56ffc0f8cb94446eab3e8886db283",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
