"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";
import { usePathname } from "next/navigation";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith("/admin");
    const storageKey = isAdmin ? "hotel-admin-theme" : "hotel-customer-theme";

    return (
        <NextThemesProvider {...props} storageKey={storageKey}>
            {children}
        </NextThemesProvider>
    );
}
