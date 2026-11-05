'use client'

import {useLayout} from "@/app/contexts/LayoutContext";
import {DISCLAIMER_NOT_A_DEVICE} from "@/lib/disclaimer";

export function SiteFooter() {
    const { showFooter } = useLayout()

    if (!showFooter) return null

    return (
        <footer className="bg-[#00274c] text-white">
            <div className="container mx-auto px-4 py-3 flex flex-col items-center justify-center gap-1">
                <p className="text-sm">
                    {/* Copyright holder from NEXT_PUBLIC_ORGANIZATION_NAME */}
                    Copyright © {new Date().getFullYear()}{process.env.NEXT_PUBLIC_ORGANIZATION_NAME ? ` ${process.env.NEXT_PUBLIC_ORGANIZATION_NAME}` : ''}. Open source software, see LICENSE.
                </p>
                <p className="text-xs text-center opacity-80">{DISCLAIMER_NOT_A_DEVICE}</p>
            </div>
        </footer>
    )
}

