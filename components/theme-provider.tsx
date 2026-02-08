"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

/**
 * ThemeProvider Component
 * * This component wraps your root layout to enable theme switching.
 * It automatically detects system preferences (Phone/Tablet/PC settings)
 * but allows for manual overrides via the useTheme() hook.
 * * @param children - The entire application (from layout.tsx)
 * @param props - Standard next-themes properties (attribute, defaultTheme, etc.)
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  );
}