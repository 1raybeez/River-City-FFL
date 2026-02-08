import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Load the Inter font (standard for a clean, modern look)
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "River City FFL | Hall of Fame",
  description: "Official manager database and historical archives for the River City Fantasy Football League.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /**
     * suppressHydrationWarning is necessary because next-themes 
     * modifies the html element before the page is fully hydrated.
     */
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="system" 
          enableSystem 
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300">
            {/* The children represent your page content (like the managers page) */}
            <main className="flex-grow">
              {children}
            </main>
            
            {/* You can add a global footer here if needed later */}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}