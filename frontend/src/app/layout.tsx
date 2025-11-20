import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ 
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "500", "600", "700", "800"],
});

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Yanck - Create Custom AI Chatbots",
  description: "Build custom RAG-powered chatbots trained on your documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bricolage.variable} ${manrope.variable}`}>{children}</body>
    </html>
  );
}
