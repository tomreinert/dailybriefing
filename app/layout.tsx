import HeaderAuth from "@/components/header-auth";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";


export const metadata = {
  title: "Daily Brief",
  description: "A demo of the Daily Brief app",
  other: {
    "google-site-verification": "QpFBixcz5m4LR12VQelNv_Q0ZGUJdl2gLjEcj2mVT1Y",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-amber-50/20 dark:bg-background  text-foreground flex flex-col min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="flex items-center justify-between border-b p-4">
            <Link href={"/"}>Daily Brief</Link>
            <nav>
              <HeaderAuth />
            </nav>
          </header>
          <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
            {children}
          </main>
          <footer className="p-4 border-t flex items-center justify-center gap-4">
            <Link href={"/dataprivacy"}>Data Privacy</Link>
            <ThemeSwitcher />
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
