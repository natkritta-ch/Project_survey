import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import { BuildVersion } from "../components/BuildVersion";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ระบบเช็คชื่อสแกนหน้า",
  description: "Face Recognition Attendance System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" translate="no">
      <body className={inter.className}>
        <Providers>
          {children}
          <BuildVersion />
        </Providers>
      </body>
    </html>
  );
}
