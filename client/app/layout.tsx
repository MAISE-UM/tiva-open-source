import './globals.css';
import type {Metadata} from "next"
import {SiteFooter} from "@/components/shared/site-footer";
import {SiteHeader} from "@/components/shared/site-header";
import {LayoutProvider} from "@/app/contexts/LayoutContext";
import React from "react";
import "react-datetime/css/react-datetime.css";
import {PermissionProvider} from "@/app/contexts/PermissionContext";

export const metadata: Metadata = {
    title: "TIVA",
    description: "TIVA Application",
}

export default function RootLayout({
   children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            {/*Layout provider allows us to control header/footer appearance*/}
            <PermissionProvider>
                <LayoutProvider>
                    <body className="flex flex-col min-h-screen bg-gray-100">
                        <SiteHeader/>
                        <main className="flex-grow">{children}</main>
                        <SiteFooter/>
                    </body>
                </LayoutProvider>
            </PermissionProvider>
        </html>
    )
}

