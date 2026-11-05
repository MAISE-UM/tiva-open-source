"use client"

import { createContext, useState, useContext, type ReactNode } from "react"

interface LayoutContextType {
    showHeader: boolean
    showFooter: boolean
    setShowHeader: (show: boolean) => void
    setShowFooter: (show: boolean) => void
}

// This whole LayoutContext allows us to define which pages have the header and footer enabled
const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [showHeader, setShowHeader] = useState<boolean>(false)
    const [showFooter, setShowFooter] = useState<boolean>(true)

    return (
        <LayoutContext.Provider value={{ showHeader, showFooter, setShowHeader, setShowFooter }}>
            {children}
        </LayoutContext.Provider>
    )
}

export function useLayout() {
    const context = useContext(LayoutContext)
    if (context === undefined) {
        throw new Error("useLayout must be used within a LayoutProvider")
    }
    return context
}

