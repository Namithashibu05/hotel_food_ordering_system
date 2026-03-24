"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="w-[72px] h-[36px] bg-muted rounded-full"></div>
    }

    return (
        <div className="flex items-center bg-muted rounded-full p-1 border border-border">
            <button
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center rounded-full p-1.5 transition-all ${theme === "light" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"}`}
                aria-label="Light Mode"
            >
                <Sun className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Light Mode</span>
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center rounded-full p-1.5 transition-all ${theme === "dark" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"}`}
                aria-label="Dark Mode"
            >
                <Moon className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Dark Mode</span>
            </button>
        </div>
    )
}
