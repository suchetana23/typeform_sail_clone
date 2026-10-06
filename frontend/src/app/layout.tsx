import type { Metadata } from "next";
import { DM_Sans, Karla } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/Toast";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const karla = Karla({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-karla" });

export const metadata: Metadata = {
  title: "Typeform",
  description: "A Typeform clone built with Next.js and FastAPI",
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('app-dark-mode');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'true' || (stored === null && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${dmSans.variable} ${karla.variable} font-sans bg-white text-[#1b1b1b] dark:bg-[#151515] dark:text-[#f7f7f7] transition-colors duration-200`}>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
