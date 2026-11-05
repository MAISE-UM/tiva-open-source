"use client"

import { useEffect } from "react"
import {useLayout} from "@/app/contexts/LayoutContext";

// Hook used in client components allows the enabling and disabling of the header and footer
export function useLayoutToggle(showHeader: boolean, showFooter: boolean) {
    const { setShowHeader, setShowFooter } = useLayout()

    useEffect(() => {
        setShowHeader(showHeader)
        setShowFooter(showFooter)

        return () => {
            setShowHeader(true)
            setShowFooter(true)
        }
    }, [showHeader, showFooter, setShowHeader, setShowFooter])
}

