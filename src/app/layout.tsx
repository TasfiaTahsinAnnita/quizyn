import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quizzy! - Real-time Quiz Fun",
  description: "Create and host live quizzes like Kahoot!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
